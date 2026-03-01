import React, { FC, useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  InputAdornment,
  Avatar,
  Slider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAlert } from "@contexts/AlertContext";
import { useWallet } from "@contexts/WalletContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { formatNumber } from "@lib/utils/general";
import { WidgetSettings } from "@components/common/WidgetSettings";

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
}

const ERG_TOKEN_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";
const CRUX_TOKEN_ID =
  "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365";

const LimitOrderWidget: FC<LimitOrderWidgetProps> = ({
  baseToken,
  quoteToken,
  ergPrice,
  disabled = false,
  onOrderCreated,
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert();
  const { dAppWallet } = useWallet();
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
  const [useExpiry, setUseExpiry] = useState(true);
  const [expiryBlocks, setExpiryBlocks] = useState(720); // ~24 hours at 2 min blocks

  // State
  const [submitting, setSubmitting] = useState(false);

  // Balances
  const [baseBalance, setBaseBalance] = useState<string | null>(null);
  const [quoteBalance, setQuoteBalance] = useState<string | null>(null);

  // Current block height for expiry calculation
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);

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

  // Set price to current market price
  useEffect(() => {
    if (baseToken && baseToken.price > 0 && !price) {
      setPrice(baseToken.price.toString());
    }
  }, [baseToken, price]);

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

  const handleMaxClick = () => {
    if (orderType === "sell") {
      // Selling base token - use base balance
      if (!baseBalance || !baseToken) return;
      const balanceNum = parseInt(baseBalance, 10);
      const formatted = (balanceNum / Math.pow(10, baseToken.decimals)).toFixed(
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
      const quoteAmount = balanceNum / Math.pow(10, quoteToken.decimals);
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
          useExpiry && currentHeight ? currentHeight + expiryBlocks : null,
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

  const expiryTimeLabel = () => {
    const hours = Math.round((expiryBlocks * 2) / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Limit Order</Typography>
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
              <InputAdornment position="end">
                <Typography variant="body2" fontWeight={600}>
                  {quoteToken.ticker}
                </Typography>
              </InputAdornment>
            ),
          }}
        />
        {baseToken && (
          <Typography variant="caption" color="text.secondary">
            Market: {formatNumber(baseToken.price, 6)} {quoteToken.ticker}
          </Typography>
        )}
      </Box>

      {/* Amount Input */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          Amount
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
              <InputAdornment position="end">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    src={baseToken?.icon}
                    sx={{ width: 20, height: 20 }}
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {baseToken?.ticker || "---"}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
          {dAppWallet.connected && (
            <Typography
              variant="caption"
              color="primary"
              sx={{
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={handleMaxClick}
            >
              Balance:{" "}
              {formatBalance(
                orderType === "sell" ? baseBalance : quoteBalance,
                orderType === "sell"
                  ? baseToken?.decimals || 0
                  : quoteToken.decimals,
              )}{" "}
              {orderType === "sell" ? baseToken?.ticker : quoteToken.ticker}
            </Typography>
          )}
        </Box>
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
              <InputAdornment position="end">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    src={quoteToken.icon}
                    sx={{ width: 20, height: 20 }}
                  />
                  <Typography variant="body2" fontWeight={600}>
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
        <FormControlLabel
          control={
            <Checkbox
              checked={useExpiry}
              onChange={(e) => setUseExpiry(e.target.checked)}
              disabled={disabled || submitting}
              size="small"
            />
          }
          label={
            <Typography variant="body2">
              Order expires in {expiryTimeLabel()}
            </Typography>
          }
        />
        {useExpiry && (
          <Box sx={{ px: 2 }}>
            <Slider
              value={expiryBlocks}
              onChange={(_, value) => setExpiryBlocks(value as number)}
              min={30}
              max={10080}
              step={30}
              disabled={disabled || submitting}
              marks={[
                { value: 30, label: "1h" },
                { value: 720, label: "24h" },
                { value: 5040, label: "7d" },
                { value: 10080, label: "14d" },
              ]}
            />
          </Box>
        )}
      </Box>

      {/* Submit Button */}
      <Button
        fullWidth
        variant="contained"
        onClick={handleSubmitOrder}
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
    </Paper>
  );
};

export default LimitOrderWidget;
