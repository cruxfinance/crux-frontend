import React, { FC, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  Avatar,
  IconButton,
} from "@mui/material";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useTheme } from "@mui/material/styles";
import { useAlert } from "@contexts/AlertContext";
import { useWallet } from "@contexts/WalletContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { WidgetSettings } from "@components/common/WidgetSettings";
import TradeConfirmationModal from "@components/trade/TradeConfirmationModal";
import { formatNumber, formatFullNumber } from "@lib/utils/general";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface TokenInfo {
  tokenId: string;
  name: string;
  ticker: string;
  icon: string;
  decimals: number;
  price: number;
}

interface MarketOrderWidgetProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
  ergPrice: number;
  disabled?: boolean;
  onSwitchToLimit?: () => void;
}

interface SwapQuote {
  pool_state: {
    pool_id: string;
    quote_amount: number;
    base_amount: number;
  };
  swap_result: {
    input_amount: number;
    output_amount: number;
    price_impact: number;
    effective_price: number;
    fee_amount: number;
    fee_token: string;
    fee_usd: number;
    lp_fee_percent?: number;
    lp_fee_amount?: number;
  };
}

import {
  ERG_TOKEN_ID,
  ERG_DECIMALS,
  CRUX_DECIMALS,
} from "@lib/configs/paymentTokens";

const MarketOrderWidget: FC<MarketOrderWidgetProps> = ({
  baseToken,
  quoteToken,
  ergPrice,
  disabled = false,
  onSwitchToLimit,
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert();
  const { dAppWallet, setAddWalletModalOpen } = useWallet();
  const { minerFee, setMinerFee } = useMinerFee();

  // Swap direction: forward = base→quote (sell base for quote), reverse = quote→base (buy base with quote)
  const [direction, setDirection] = useState<"forward" | "reverse">("forward");

  // Amount input
  const [amount, setAmount] = useState("");
  const [estimatedOutput, setEstimatedOutput] = useState("");

  // Loading and swap state
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [noPoolFound, setNoPoolFound] = useState(false);

  // Fee settings - default to "erg", will load from localStorage in useEffect
  const [feeToken, setFeeToken] = useState<"erg" | "crux">("erg");

  // Confirmation modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Balances
  const [baseBalance, setBaseBalance] = useState<string | null>(null);
  const [quoteBalance, setQuoteBalance] = useState<string | null>(null);

  // Load and persist fee token preference
  useEffect(() => {
    // Load on mount
    const saved = localStorage.getItem("swapFeeTokenPreference");
    if (saved === "crux" || saved === "erg") {
      setFeeToken(saved);
    }
  }, []);

  useEffect(() => {
    // Persist when changed
    localStorage.setItem("swapFeeTokenPreference", feeToken);
  }, [feeToken]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!dAppWallet.connected || !baseToken) return;

    try {
      if (!window.ergoConnector?.nautilus) return;

      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();

      const baseBal = await context.get_balance(baseToken.tokenId);
      setBaseBalance(baseBal);

      const quoteBal = await context.get_balance(quoteToken.tokenId);
      setQuoteBalance(quoteBal);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [baseToken, quoteToken.tokenId, dAppWallet.connected]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // Reset state when token changes
  useEffect(() => {
    setAmount("");
    setEstimatedOutput("");
    setQuote(null);
    setNoPoolFound(false);
  }, [baseToken?.tokenId]);

  // Fetch quote when amount changes
  useEffect(() => {
    if (!baseToken || !amount || parseFloat(amount) <= 0) {
      setEstimatedOutput("");
      setQuote(null);
      setNoPoolFound(false);
      return;
    }

    const abortController = new AbortController();

    const fetchQuote = async () => {
      setLoading(true);
      setNoPoolFound(false);

      try {
        // Determine given and requested tokens based on order type
        const givenTokenId =
          direction === "reverse" ? quoteToken.tokenId : baseToken.tokenId;
        const requestedTokenId =
          direction === "reverse" ? baseToken.tokenId : quoteToken.tokenId;
        const givenDecimals =
          direction === "reverse" ? quoteToken.decimals : baseToken.decimals;
        const requestedDecimals =
          direction === "reverse" ? baseToken.decimals : quoteToken.decimals;

        const rawAmount = Math.floor(
          parseFloat(amount) * Math.pow(10, givenDecimals),
        );

        const params = new URLSearchParams({
          given_token_id: givenTokenId,
          requested_token_id: requestedTokenId,
          given_token_amount: rawAmount.toString(),
          fee_token: feeToken,
        });

        const response = await fetch(
          `${process.env.CRUX_API}/spectrum/best_swap?${params}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          if (response.status === 404) {
            setNoPoolFound(true);
            setEstimatedOutput("");
            setQuote(null);
            return;
          }
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data: SwapQuote = await response.json();
        setQuote(data);

        const output =
          data.swap_result.output_amount / Math.pow(10, requestedDecimals);
        setEstimatedOutput(output.toFixed(requestedDecimals));
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Error fetching quote:", error);
        setQuote(null);
        setEstimatedOutput("");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [amount, direction, baseToken, quoteToken, feeToken]);

  const handleFlipDirection = () => {
    setDirection((prev) => (prev === "forward" ? "reverse" : "forward"));
    setAmount("");
    setEstimatedOutput("");
    setQuote(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handlePercentClick = (pct: number) => {
    const balance = direction === "reverse" ? quoteBalance : baseBalance;
    const decimals =
      direction === "reverse" ? quoteToken.decimals : baseToken?.decimals || 0;

    if (!balance) return;

    const balanceNum = parseInt(balance, 10);
    const scaled = pct === 100 ? balanceNum : Math.floor(balanceNum * pct / 100);
    const formatted = (scaled / Math.pow(10, decimals)).toFixed(decimals);
    setAmount(formatted);
  };

  const handleExecuteOrder = async () => {
    if (!baseToken || !quote || !window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }

    setExecuting(true);
    try {
      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();
      const changeAddress = await context.get_change_address();

      const usedAddresses = await context.get_used_addresses();
      const unusedAddresses = await context.get_unused_addresses();
      const allAddresses = [
        changeAddress,
        ...usedAddresses,
        ...unusedAddresses,
      ];
      const userAddresses = [...new Set(allAddresses)].join(",");

      const givenTokenId =
        direction === "reverse" ? quoteToken.tokenId : baseToken.tokenId;
      const givenDecimals =
        direction === "reverse" ? quoteToken.decimals : baseToken.decimals;
      const rawAmount = Math.floor(
        parseFloat(amount) * Math.pow(10, givenDecimals),
      );

      const params = new URLSearchParams({
        user_addresses: userAddresses,
        target_address: changeAddress,
        given_token_id: givenTokenId,
        given_token_amount: rawAmount.toString(),
        pool_id: quote.pool_state.pool_id,
        fee_token: feeToken,
        miner_fee: minerFee.toString(),
      });

      const response = await fetch(
        `${process.env.CRUX_API}/spectrum/build_swap_tx?${params}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to build transaction: ${errorText}`);
      }

      const unsignedTx = await response.json();
      const signedTx = await context.sign_tx(unsignedTx);
      const txId = await context.submit_tx(signedTx);

      addAlert(
        "success",
        `Order executed! Transaction: ${txId.slice(0, 8)}...`,
      );

      // Reset form
      setAmount("");
      setEstimatedOutput("");
      setQuote(null);

      // Refresh balances
      setTimeout(fetchBalances, 2000);
    } catch (error: any) {
      console.error("Error executing order:", error);
      addAlert("error", error.info || error.message || "Order failed");
    } finally {
      setExecuting(false);
    }
  };

  const formatBalance = (balance: string | null, decimals: number): string => {
    if (!balance) return "0";
    const num = parseInt(balance, 10) / Math.pow(10, decimals);
    if (num === 0) return "0";
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(2);
  };

  const inputToken = direction === "reverse" ? quoteToken : baseToken;
  const outputToken = direction === "reverse" ? baseToken : quoteToken;
  const inputDecimals =
    direction === "reverse" ? quoteToken.decimals : baseToken?.decimals || 0;
  const outputDecimals =
    direction === "reverse" ? baseToken?.decimals || 0 : quoteToken.decimals;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          mb: 1,
        }}
      >
        <WidgetSettings
          feeToken={feeToken}
          onFeeTokenChange={setFeeToken}
          minerFee={minerFee}
          onMinerFeeChange={setMinerFee}
          disabled={executing}
          ergPrice={ergPrice}
        />
      </Box>

      {/* Amount Input */}
      <Box sx={{ mb: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          {direction === "reverse" ? "You Pay" : "You Sell"}
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="0.0"
          value={amount}
          onChange={handleAmountChange}
          disabled={disabled || executing}
          InputProps={{
            startAdornment: loading ? (
              <InputAdornment position="start">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : null,
            endAdornment: (
              <InputAdornment position="end" sx={{ padding: 0, margin: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
                  <Avatar
                    src={inputToken?.icon}
                    sx={{ width: 24, height: 24 }}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 600,
                      lineHeight: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {inputToken?.ticker || "---"}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {amount && ergPrice
              ? `~$${formatFullNumber(
                  parseFloat(amount) * (inputToken?.price || 0) * ergPrice,
                  2,
                )}`
              : " "}
          </Typography>
          {dAppWallet.connected && (
            <Typography variant="caption" color="text.secondary">
              Balance:{" "}
              {formatBalance(
                direction === "reverse" ? quoteBalance : baseBalance,
                inputDecimals,
              )}{" "}
              {inputToken?.ticker}
            </Typography>
          )}
        </Box>
        {dAppWallet.connected && (
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
            {[25, 50, 75, 100].map((pct) => (
              <Button
                key={pct}
                size="small"
                variant="outlined"
                onClick={() => handlePercentClick(pct)}
                disabled={disabled || executing}
                aria-label={`Set amount to ${pct === 100 ? "maximum" : pct + "%"} of balance`}
                sx={{
                  minWidth: 0,
                  flex: 1,
                  px: 0.5,
                  py: 0.25,
                  fontSize: "0.7rem",
                  lineHeight: 1.4,
                  borderColor: theme.palette.divider,
                  color: "text.secondary",
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                    color: "text.primary",
                  },
                }}
              >
                {pct === 100 ? "Max" : `${pct}%`}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      {/* Flip Direction Button */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 1, mt: -0.5 }}>
        <IconButton
          onClick={handleFlipDirection}
          disabled={disabled || executing}
          size="small"
          sx={{
            bgcolor: theme.palette.background.default,
            border: `1px solid ${theme.palette.divider}`,
            "&:hover": {
              bgcolor: theme.palette.action.hover,
              borderColor: theme.palette.primary.main,
            },
          }}
        >
          <SwapVertIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Estimated Output */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          You Receive
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="0.0"
          value={estimatedOutput}
          disabled
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ padding: 0, margin: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
                  <Avatar
                    src={outputToken?.icon}
                    sx={{ width: 24, height: 24 }}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 600,
                      lineHeight: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {outputToken?.ticker || "---"}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {estimatedOutput && ergPrice
              ? `~$${formatFullNumber(
                  parseFloat(estimatedOutput) * (outputToken?.price || 0) * ergPrice,
                  2,
                )}`
              : " "}
          </Typography>
          {dAppWallet.connected && (
            <Typography variant="caption" color="text.secondary">
              Balance:{" "}
              {formatBalance(
                direction === "reverse" ? baseBalance : quoteBalance,
                outputDecimals,
              )}{" "}
              {outputToken?.ticker}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Quote Details */}
      {quote && (
        <Box
          sx={{
            mb: 2,
            p: 1,
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
          }}
        >
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              Price Impact
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color:
                  quote.swap_result.price_impact > 5
                    ? theme.palette.error.main
                    : quote.swap_result.price_impact > 2
                      ? theme.palette.warning.main
                      : theme.palette.success.main,
              }}
            >
              {quote.swap_result.price_impact.toFixed(2)}%
            </Typography>
          </Box>

          {/* Fees */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Fees
            </Typography>
            <Box
              sx={{
                pl: 1,
                mt: 0.5,
                borderLeft: `2px solid ${theme.palette.divider}`,
              }}
            >
              {quote.swap_result.lp_fee_percent != null && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.25,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    LP Fee ({quote.swap_result.lp_fee_percent.toFixed(2)}%)
                  </Typography>
                </Box>
              )}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.25,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Miner Fee
                </Typography>
                <Typography variant="caption">
                  {(minerFee / 1e9).toFixed(4)} ERG
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  Service Fee
                </Typography>
                <Typography variant="caption">
                  {(
                    quote.swap_result.fee_amount /
                    Math.pow(
                      10,
                      quote.swap_result.fee_token === "erg"
                        ? ERG_DECIMALS
                        : CRUX_DECIMALS,
                    )
                  ).toFixed(4)}{" "}
                  {quote.swap_result.fee_token.toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="caption">
                  ~${quote.swap_result.fee_usd.toFixed(4)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* No Pool Found */}
      {noPoolFound && (
        <Box sx={{ mb: 2, textAlign: "center" }}>
          <Typography variant="body2" color="error">
            No liquidity pool found for this pair
          </Typography>
          {onSwitchToLimit && (
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: "pointer", mt: 0.5, textDecoration: "underline" }}
              onClick={onSwitchToLimit}
            >
              Place a limit order instead
            </Typography>
          )}
        </Box>
      )}

      {/* High Price Impact Warning */}
      {quote && quote.swap_result.price_impact > 5 && (
        <Typography
          variant="caption"
          color="error"
          sx={{ display: "block", mb: 1, textAlign: "center" }}
        >
          Warning: High price impact ({quote.swap_result.price_impact.toFixed(1)}%)
        </Typography>
      )}

      {/* Execute Button */}
      {!dAppWallet.connected ? (
        <Button
          fullWidth
          variant="contained"
          onClick={() => setAddWalletModalOpen(true)}
          sx={{ height: 48 }}
        >
          Connect Wallet
        </Button>
      ) : (
        <Button
          fullWidth
          variant="contained"
          onClick={() => setConfirmModalOpen(true)}
          disabled={disabled || !quote || loading || executing || noPoolFound}
          color={direction === "reverse" ? "success" : "error"}
          sx={{ height: 48 }}
        >
          {executing ? (
            <CircularProgress size={24} color="inherit" />
          ) : loading ? (
            "Loading..."
          ) : !amount ? (
            "Enter Amount"
          ) : noPoolFound ? (
            "No Pool Found"
          ) : !quote ? (
            "Getting Quote..."
          ) : (
            `${direction === "reverse" ? "Buy" : "Sell"} ${baseToken?.ticker || ""}`
          )}
        </Button>
      )}

      {/* Confirmation Modal */}
      {quote && inputToken && outputToken && (
        <TradeConfirmationModal
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => {
            setConfirmModalOpen(false);
            handleExecuteOrder();
          }}
          direction={direction}
          inputAmount={amount}
          inputToken={inputToken}
          outputAmount={estimatedOutput}
          outputToken={outputToken}
          priceImpact={quote.swap_result.price_impact}
          lpFeePercent={quote.swap_result.lp_fee_percent}
          feeAmount={quote.swap_result.fee_amount}
          feeToken={quote.swap_result.fee_token}
          feeUsd={quote.swap_result.fee_usd}
          minerFee={minerFee}
          ergPrice={ergPrice}
          executing={executing}
        />
      )}
    </Box>
  );
};

export default MarketOrderWidget;
