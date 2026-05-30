import React, { FC, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  InputAdornment,
  Avatar,
  Chip,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAlert } from "@contexts/AlertContext";
import { useWallet } from "@contexts/WalletContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { formatNumber, formatFullNumber, calculatePairPrice } from "@lib/utils/general";
import { WidgetSettings } from "@components/common/WidgetSettings";
import LimitOrderConfirmationModal from "@components/trade/LimitOrderConfirmationModal";

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

interface LimitOrderWidgetProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
  ergPrice: number;
  disabled?: boolean;
  onOrderCreated?: () => void;
  externalPrice?: number | null;
  externalAmount?: number | null;
  onExternalPriceConsumed?: () => void;
}

import {
  ERG_TOKEN_ID,
  ERG_DECIMALS,
  CRUX_TOKEN_ID,
  CRUX_DECIMALS,
} from "@lib/configs/paymentTokens";

const EXPIRY_PRESETS: { label: string; blocks: number | null }[] = [
  { label: "1h", blocks: 30 },
  { label: "6h", blocks: 180 },
  { label: "24h", blocks: 720 },
  { label: "7d", blocks: 5040 },
  { label: "14d", blocks: 10080 },
  { label: "No Expiry", blocks: null },
];

const LimitOrderWidget: FC<LimitOrderWidgetProps> = ({
  baseToken,
  quoteToken,
  ergPrice,
  disabled = false,
  onOrderCreated,
  externalPrice,
  externalAmount,
  onExternalPriceConsumed,
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert();
  const { dAppWallet, setAddWalletModalOpen } = useWallet();
  const { minerFee, setMinerFee } = useMinerFee();

  // Order type: buy or sell
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");

  // Fee token selection - default to "erg", will load from localStorage
  const [feeToken, setFeeToken] = useState<"erg" | "crux">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("limitOrderFeeTokenPreference");
      if (stored === "crux") return "crux";
    }
    return "erg";
  });

  // Persist fee token preference
  useEffect(() => {
    localStorage.setItem("limitOrderFeeTokenPreference", feeToken);
  }, [feeToken]);

  // Form inputs
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<number | null>(720); // blocks, null = no expiry

  // State
  const [submitting, setSubmitting] = useState(false);

  // Balances
  const [baseBalance, setBaseBalance] = useState<string | null>(null);
  const [quoteBalance, setQuoteBalance] = useState<string | null>(null);

  // Current block height for expiry calculation
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);

  // Confirmation modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Fee estimate
  const [feeEstimate, setFeeEstimate] = useState<{
    fee_amount: number;
    fee_token: string;
    fee_usd: number;
  } | null>(null);

  useEffect(() => {
    const fetchFeeEstimate = async () => {
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/dex/fee_estimate?fee_token=${feeToken}`
        );
        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            setFeeEstimate(data);
          }
        }
      } catch (error) {
        console.error("Error fetching fee estimate:", error);
      }
    };
    fetchFeeEstimate();
  }, [feeToken]);

  // Fetch current block height
  useEffect(() => {
    const fetchHeight = async () => {
      try {
        const response = await fetch(`${process.env.CRUX_API}/crux/info`);
        if (response.ok) {
          const data = await response.json();
          if (data.indexed_height) {
            setCurrentHeight(data.indexed_height);
          }
        }
      } catch (error) {
        console.error("Error fetching block height:", error);
      }
    };
    fetchHeight();
    const interval = setInterval(fetchHeight, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

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

  // Reset form when token changes
  useEffect(() => {
    setPrice("");
    setAmount("");
    setTotal("");
  }, [baseToken?.tokenId]);

  // Set price to current market price (pair rate, not base token price)
  const pairPrice = calculatePairPrice(baseToken?.price, quoteToken.price);

  useEffect(() => {
    if (baseToken && pairPrice > 0 && !price) {
      setPrice(pairPrice.toString());
    }
  }, [baseToken, pairPrice, price]);

  // Handle external price/amount from order book click
  useEffect(() => {
    if (externalPrice != null) {
      setPrice(externalPrice.toString());
      if (externalAmount != null) {
        const amtStr = externalAmount.toFixed(baseToken?.decimals || 0);
        setAmount(amtStr);
        const calculatedTotal = externalPrice * externalAmount;
        setTotal(calculatedTotal.toFixed(quoteToken.decimals));
      } else if (amount) {
        const calculatedTotal = externalPrice * parseFloat(amount);
        setTotal(calculatedTotal.toFixed(quoteToken.decimals));
      }
      onExternalPriceConsumed?.();
    }
  }, [externalPrice, externalAmount]);

  // Calculate total when price or amount changes
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPrice(value);
      if (value && amount) {
        const calculatedTotal = parseFloat(value) * parseFloat(amount);
        setTotal(calculatedTotal.toFixed(quoteToken.decimals));
      }
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      if (value && price) {
        const calculatedTotal = parseFloat(price) * parseFloat(value);
        setTotal(calculatedTotal.toFixed(quoteToken.decimals));
      }
    }
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setTotal(value);
      if (value && price && parseFloat(price) > 0) {
        const calculatedAmount = parseFloat(value) / parseFloat(price);
        setAmount(calculatedAmount.toFixed(baseToken?.decimals || 0));
      }
    }
  };

  const handleOrderTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: "buy" | "sell" | null,
  ) => {
    if (newType) {
      setOrderType(newType);
    }
  };

  const handlePercentClick = (pct: number) => {
    if (orderType === "sell") {
      // Selling base token - use base balance
      if (!baseBalance || !baseToken) return;
      const balanceNum = parseInt(baseBalance, 10);
      const scaled = pct === 100 ? balanceNum : Math.floor(balanceNum * pct / 100);
      const formatted = (scaled / Math.pow(10, baseToken.decimals)).toFixed(
        baseToken.decimals,
      );
      setAmount(formatted);
      if (price) {
        const calculatedTotal = parseFloat(price) * parseFloat(formatted);
        setTotal(calculatedTotal.toFixed(quoteToken.decimals));
      }
    } else {
      // Buying - use quote balance to calculate max amount
      if (!quoteBalance || !price || parseFloat(price) === 0) return;
      const balanceNum = parseInt(quoteBalance, 10);
      const scaled = pct === 100 ? balanceNum : Math.floor(balanceNum * pct / 100);
      const quoteAmount = scaled / Math.pow(10, quoteToken.decimals);
      setTotal(quoteAmount.toFixed(quoteToken.decimals));
      const calculatedAmount = quoteAmount / parseFloat(price);
      setAmount(calculatedAmount.toFixed(baseToken?.decimals || 0));
    }
  };

  const handleSubmitOrder = async () => {
    if (!baseToken || !window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }

    if (
      !price ||
      !amount ||
      parseFloat(price) <= 0 ||
      parseFloat(amount) <= 0
    ) {
      addAlert("error", "Please enter valid price and amount");
      return;
    }

    setSubmitting(true);
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

      // Determine given and taken based on order type
      // Buy: giving quote (ERG), taking base token
      // Sell: giving base token, taking quote (ERG)
      const givenTokenId =
        orderType === "buy" ? quoteToken.tokenId : baseToken.tokenId;
      const takenTokenId =
        orderType === "buy" ? baseToken.tokenId : quoteToken.tokenId;
      const givenDecimals =
        orderType === "buy" ? quoteToken.decimals : baseToken.decimals;

      // Calculate given amount
      const givenAmount =
        orderType === "buy"
          ? Math.floor(parseFloat(total) * Math.pow(10, quoteToken.decimals))
          : Math.floor(parseFloat(amount) * Math.pow(10, baseToken.decimals));

      // Price as ratio: taken/given
      // For buy: we give ERG, get base token. Price is base_per_erg.
      // For sell: we give base token, get ERG. Price is erg_per_base.
      const priceFloat = parseFloat(price);

      // Price ratio in raw units: takenReceived * priceDenom >= givenSpent * priceNum
      // givenSpent/takenReceived are in raw units (nanoERG for ERG, raw token units for tokens)
      // priceDenom = 10^givenDecimals to convert givenSpent from raw to human scale
      // priceNum converts the rate into raw taken units per priceDenom raw given units
      // For BUY: user wants to receive at least X tokens, so use ceil() to guarantee minimum
      // For SELL: user wants to receive at least X ERG, so use ceil() to guarantee minimum
      const takenDecimals =
        orderType === "buy" ? baseToken.decimals : quoteToken.decimals;
      const priceDenominator = Math.pow(10, givenDecimals);
      const priceNumerator =
        orderType === "buy"
          ? Math.ceil((1 / priceFloat) * Math.pow(10, takenDecimals))
          : Math.ceil(priceFloat * Math.pow(10, takenDecimals));

      const requestBody = {
        user_addresses: userAddresses,
        given_token_id: givenTokenId,
        given_token_amount: givenAmount,
        taken_token_id: takenTokenId,
        price_numerator: priceNumerator,
        price_denominator: priceDenominator,
        min_fill_amount: 0,
        expiry_height:
          expiryPreset !== null && currentHeight ? currentHeight + expiryPreset : null,
        // executor_fee is calculated by the API based on USD target value
        miner_fee: minerFee,
        fee_token_id: feeToken === "crux" ? CRUX_TOKEN_ID : null,
      };

      const response = await fetch(`${process.env.CRUX_API}/dex/limit_order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.unsigned_tx) {
        throw new Error("No transaction returned from API");
      }

      // Sign and submit
      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await context.submit_tx(signedTx);

      addAlert("success", `Limit order created! TX: ${txId.slice(0, 8)}...`);

      // Reset form
      setPrice("");
      setAmount("");
      setTotal("");

      // Refresh balances
      setTimeout(fetchBalances, 2000);

      // Notify parent
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (error: any) {
      console.error("Error creating limit order:", error);
      addAlert(
        "error",
        error.info || error.message || "Failed to create order",
      );
    } finally {
      setSubmitting(false);
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

  const expiryTimeLabel = (): string | null => {
    if (expiryPreset === null) return null;
    const preset = EXPIRY_PRESETS.find((p) => p.blocks === expiryPreset);
    return preset ? preset.label : null;
  };

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
          disabled={disabled || submitting}
          ergPrice={ergPrice}
        />
      </Box>

      {/* Buy/Sell Toggle */}
      <ToggleButtonGroup
        value={orderType}
        exclusive
        onChange={handleOrderTypeChange}
        fullWidth
        sx={{ mb: 2 }}
        disabled={disabled || submitting}
      >
        <ToggleButton
          value="buy"
          sx={{
            "&.Mui-selected": {
              bgcolor: theme.palette.success.main,
              color: theme.palette.success.contrastText,
              "&:hover": { bgcolor: theme.palette.success.dark },
            },
          }}
        >
          Buy
        </ToggleButton>
        <ToggleButton
          value="sell"
          sx={{
            "&.Mui-selected": {
              bgcolor: theme.palette.error.main,
              color: theme.palette.error.contrastText,
              "&:hover": { bgcolor: theme.palette.error.dark },
            },
          }}
        >
          Sell
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Price Input */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          Price ({quoteToken.ticker} per {baseToken?.ticker || "token"})
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="0.0"
          value={price}
          onChange={handlePriceChange}
          disabled={disabled || submitting}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ padding: 0, margin: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
                  <Avatar
                    src={quoteToken.icon}
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
                    {quoteToken.ticker}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        {baseToken && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Market: {formatFullNumber(pairPrice, 6)} {quoteToken.ticker}
            </Typography>
            {price && pairPrice > 0 && (() => {
              const diff = ((parseFloat(price) - pairPrice) / pairPrice) * 100;
              if (isNaN(diff) || Math.abs(diff) < 0.01) return null;
              const isFavorable = orderType === "sell" ? diff > 0 : diff < 0;
              return (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: isFavorable
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                  }}
                >
                  {diff > 0 ? "+" : ""}{diff.toFixed(2)}%
                </Typography>
              );
            })()}
          </Box>
        )}
      </Box>

      {/* Amount Input */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          Amount ({baseToken?.ticker || "token"})
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="0.0"
          value={amount}
          onChange={handleAmountChange}
          disabled={disabled || submitting}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ padding: 0, margin: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
                  <Avatar
                    src={baseToken?.icon}
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
                    {baseToken?.ticker || "---"}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        {dAppWallet.connected && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Balance:{" "}
              {formatBalance(
                orderType === "sell" ? baseBalance : quoteBalance,
                orderType === "sell"
                  ? baseToken?.decimals || 0
                  : quoteToken.decimals,
              )}{" "}
              {orderType === "sell" ? baseToken?.ticker : quoteToken.ticker}
            </Typography>
          </Box>
        )}
        {dAppWallet.connected && (
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
            {[25, 50, 75, 100].map((pct) => (
              <Button
                key={pct}
                size="small"
                variant="outlined"
                onClick={() => handlePercentClick(pct)}
                disabled={disabled || submitting}
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

      {/* Total Input */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          Total
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="0.0"
          value={total}
          onChange={handleTotalChange}
          disabled={disabled || submitting}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ padding: 0, margin: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
                  <Avatar
                    src={quoteToken.icon}
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
                    {quoteToken.ticker}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Expiry Option */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
          Expiry
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {EXPIRY_PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              size="small"
              variant={expiryPreset === p.blocks ? "filled" : "outlined"}
              color={expiryPreset === p.blocks ? "primary" : "default"}
              onClick={() => setExpiryPreset(p.blocks)}
              disabled={disabled || submitting}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Expired orders return funds automatically
        </Typography>
      </Box>

      {/* Order Summary */}
      {price && amount && baseToken && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
          }}
        >
          {/* Price vs Market */}
          {(() => {
            const priceFloat = parseFloat(price);
            const marketPrice = pairPrice;
            if (!priceFloat || !marketPrice) return null;
            const diff = ((priceFloat - marketPrice) / marketPrice) * 100;
            const isAbove = diff > 0;
            // For buy orders: above market = worse price, below = better
            // For sell orders: above market = better price, below = worse
            const isFavorable = orderType === "sell" ? isAbove : !isAbove;
            return (
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  vs Market Price
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: Math.abs(diff) < 0.1
                      ? theme.palette.text.secondary
                      : isFavorable
                        ? theme.palette.success.main
                        : theme.palette.error.main,
                  }}
                >
                  {isAbove ? "+" : ""}{diff.toFixed(2)}% {isAbove ? "above" : "below"}
                </Typography>
              </Box>
            );
          })()}

          {/* Total Value */}
          {total && ergPrice > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Total Value
              </Typography>
              <Typography variant="caption">
                ~${formatFullNumber(parseFloat(total) * ergPrice, 2)} USD
              </Typography>
            </Box>
          )}

          {/* Executor Fee */}
          {feeEstimate && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Executor Fee
              </Typography>
              <Typography variant="caption">
                {feeEstimate.fee_token === "erg"
                  ? `${(feeEstimate.fee_amount / 1e9).toFixed(4)} ERG`
                  : `${(feeEstimate.fee_amount / Math.pow(10, CRUX_DECIMALS)).toFixed(CRUX_DECIMALS)} CRUX`}
                {feeEstimate.fee_usd > 0 && ` (~$${feeEstimate.fee_usd.toFixed(4)})`}
              </Typography>
            </Box>
          )}

          {/* Miner Fee */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Miner Fee
            </Typography>
            <Typography variant="caption">
              {(minerFee / 1e9).toFixed(4)} ERG
              {ergPrice > 0 && ` (~$${((minerFee / 1e9) * ergPrice).toFixed(4)})`}
            </Typography>
          </Box>

          {/* Fee Reserve */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Tooltip title="Refundable ERG reserved to cover miner fees when your order is filled. Unused reserve is returned when the order is cancelled or expires." arrow>
              <Typography variant="caption" color="text.secondary" sx={{ cursor: "help", textDecoration: "underline dotted" }}>
                Fee Reserve (20 fills)
              </Typography>
            </Tooltip>
            <Typography variant="caption">
              {((minerFee * 20) / 1e9).toFixed(4)} ERG
            </Typography>
          </Box>
        </Box>
      )}

      {/* Submit Button */}
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
          disabled={disabled || !price || !amount || submitting}
          color={orderType === "buy" ? "success" : "error"}
          sx={{ height: 48 }}
        >
          {submitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : !price || !amount ? (
            "Enter Price & Amount"
          ) : (
            `Place ${orderType === "buy" ? "Buy" : "Sell"} Order`
          )}
        </Button>
      )}

      {/* Confirmation Modal */}
      {baseToken && price && amount && (
        <LimitOrderConfirmationModal
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => {
            setConfirmModalOpen(false);
            handleSubmitOrder();
          }}
          orderType={orderType}
          baseToken={baseToken}
          quoteToken={quoteToken}
          price={price}
          amount={amount}
          total={total}
          marketPrice={pairPrice}
          ergPrice={ergPrice}
          feeEstimate={feeEstimate}
          minerFee={minerFee}
          expiryLabel={expiryTimeLabel()}
          submitting={submitting}
        />
      )}
    </Box>
  );
};

export default LimitOrderWidget;
