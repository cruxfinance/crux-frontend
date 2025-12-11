import React, { FC, useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  useTheme,
  InputAdornment,
  Avatar,
} from "@mui/material";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useAlert } from "@contexts/AlertContext";
import { checkLocalIcon, getIconUrlFromServer } from "@lib/utils/icons";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface SwapWidgetProps {
  tokenId: string;
  tokenName: string;
  tokenTicker: string;
}

interface PoolState {
  pool_id: string;
  address: string;
  quote_token_id: string;
  quote_token_name: string;
  base_token_id: string;
  base_token_name: string;
  quote_amount: number;
  base_amount: number;
  erg_value: number;
  quote_token_decimals?: number;
  base_token_decimals?: number;
  fee_numerator?: number;
}

interface SwapResult {
  pool: PoolState;
  output_amount: number;
  price_impact: number;
  effective_price: number;
}

interface BestSwapResponse {
  pool_state: PoolState;
  swap_result: SwapResult;
}

interface EIP12UnsignedTransaction {
  inputs: any[];
  dataInputs: any[];
  outputs: any[];
}

interface TokenPrice {
  erg_price_usd: number;
  asset_price_erg: number;
}

const ERG_TOKEN_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";
const ERG_DECIMALS = 9;

const SwapWidget: FC<SwapWidgetProps> = ({
  tokenId,
  tokenName,
  tokenTicker,
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert();

  const [fromToken, setFromToken] = useState<"token" | "erg">("token");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [bestSwap, setBestSwap] = useState<BestSwapResponse | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number | null>(null);
  const [tokenIcon, setTokenIcon] = useState<string>("");
  const [ergIcon, setErgIcon] = useState<string>("");
  const [tokenPrice, setTokenPrice] = useState<TokenPrice | null>(null);
  const [ergPrice, setErgPrice] = useState<number | null>(null);

  const givenTokenId = fromToken === "token" ? tokenId : ERG_TOKEN_ID;
  const requestedTokenId = fromToken === "token" ? ERG_TOKEN_ID : tokenId;
  const fromTokenName = fromToken === "token" ? tokenTicker : "ERG";
  const toTokenName = fromToken === "token" ? "ERG" : tokenTicker;

  // Fetch token decimals and icon
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const endpoint = `${process.env.CRUX_API}/crux/token_info/${tokenId}`;
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTokenDecimals(data.decimals);
        }
      } catch (error) {
        console.error("Error fetching token decimals:", error);
        // Default to 0 decimals if fetch fails
        setTokenDecimals(0);
      }

      // Fetch token icon
      let icon = await checkLocalIcon(tokenId);
      if (!icon) {
        icon = await getIconUrlFromServer(tokenId);
      }
      if (icon) {
        setTokenIcon(icon);
      }
    };

    fetchTokenData();
  }, [tokenId]);

  // Fetch ERG icon
  useEffect(() => {
    const fetchErgIcon = async () => {
      const icon = await checkLocalIcon(ERG_TOKEN_ID);
      if (icon) {
        setErgIcon(icon);
      }
    };

    fetchErgIcon();
  }, []);

  // Fetch token price
  useEffect(() => {
    const fetchTokenPrice = async () => {
      try {
        const endpoint = `${process.env.CRUX_API}/spectrum/price`;
        const params = new URLSearchParams({
          token_id: tokenId,
        });

        const response = await fetch(`${endpoint}?${params}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data: TokenPrice = await response.json();
          setTokenPrice(data);
        }
      } catch (error) {
        console.error("Error fetching token price:", error);
      }
    };

    fetchTokenPrice();
  }, [tokenId]);

  // Fetch ERG price
  useEffect(() => {
    const fetchErgPrice = async () => {
      try {
        const endpoint = `${process.env.CRUX_API}/coingecko/erg_price`;
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setErgPrice(data.price);
        }
      } catch (error) {
        console.error("Error fetching ERG price:", error);
      }
    };

    fetchErgPrice();
  }, []);

  const getGivenTokenDecimals = useCallback((): number => {
    if (fromToken === "erg") return ERG_DECIMALS;
    return tokenDecimals ?? 0;
  }, [fromToken, tokenDecimals]);

  const getRequestedTokenDecimals = useCallback((): number => {
    if (fromToken === "token") return ERG_DECIMALS;
    return tokenDecimals ?? 0;
  }, [fromToken, tokenDecimals]);

  const convertToRawAmount = useCallback(
    (amount: string, decimals: number): number => {
      const num = parseFloat(amount);
      if (isNaN(num)) return 0;
      return Math.floor(num * Math.pow(10, decimals));
    },
    [],
  );

  const convertFromRawAmount = useCallback(
    (rawAmount: number, decimals: number): string => {
      return (rawAmount / Math.pow(10, decimals)).toFixed(decimals);
    },
    [],
  );

  const fetchBestSwap = useCallback(
    async (amount: string) => {
      if (!amount || parseFloat(amount) <= 0 || tokenDecimals === null) {
        setToAmount("");
        setBestSwap(null);
        return;
      }

      setLoading(true);
      try {
        const givenDecimals = getGivenTokenDecimals();
        const requestedDecimals = getRequestedTokenDecimals();
        const rawAmount = convertToRawAmount(amount, givenDecimals);

        const endpoint = `${process.env.CRUX_API}/spectrum/best_swap`;
        const params = new URLSearchParams({
          given_token_id: givenTokenId,
          given_token_amount: rawAmount.toString(),
          requested_token_id: requestedTokenId,
        });

        const response = await fetch(`${endpoint}?${params}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("No pool found for this token pair");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: BestSwapResponse = await response.json();
        setBestSwap(data);

        const outputAmountFormatted = convertFromRawAmount(
          data.swap_result.output_amount,
          requestedDecimals,
        );
        setToAmount(outputAmountFormatted);
      } catch (error: any) {
        console.error("Error fetching best swap:", error);
        addAlert("error", error.message || "Failed to fetch swap quote");
        setToAmount("");
        setBestSwap(null);
      } finally {
        setLoading(false);
      }
    },
    [
      givenTokenId,
      requestedTokenId,
      tokenDecimals,
      addAlert,
      getGivenTokenDecimals,
      getRequestedTokenDecimals,
      convertToRawAmount,
      convertFromRawAmount,
    ],
  );

  useEffect(() => {
    if (fromAmount && tokenDecimals !== null) {
      const timer = setTimeout(() => {
        fetchBestSwap(fromAmount);
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    } else {
      setToAmount("");
      setBestSwap(null);
    }
  }, [fromAmount, fetchBestSwap, tokenDecimals]);

  const handleSwapDirection = () => {
    setFromToken(fromToken === "token" ? "erg" : "token");
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setBestSwap(null);
  };

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value);
    }
  };

  const handleSwap = async () => {
    if (!fromAmount || !bestSwap || !window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }

    setSwapping(true);
    try {
      const ergoCnct = window.ergoConnector.nautilus;

      // Disconnect and reconnect to ensure fresh connection
      await ergoCnct.disconnect();
      const connected = await ergoCnct.connect();

      if (!connected) {
        throw new Error("Failed to connect to Nautilus");
      }

      const context = await ergoCnct.getContext();
      const changeAddress = await context.get_change_address();

      // Get all user addresses for input selection
      const usedAddresses = await context.get_used_addresses();
      const unusedAddresses = await context.get_unused_addresses();
      const allAddresses = [
        changeAddress,
        ...usedAddresses,
        ...unusedAddresses,
      ];
      const userAddresses = [...new Set(allAddresses)].join(",");

      const givenDecimals = getGivenTokenDecimals();
      const rawAmount = convertToRawAmount(fromAmount, givenDecimals);

      // Build swap transaction
      const buildEndpoint = `${process.env.CRUX_API}/spectrum/build_swap_tx`;
      const params = new URLSearchParams({
        user_addresses: userAddresses,
        target_address: changeAddress,
        given_token_id: givenTokenId,
        given_token_amount: rawAmount.toString(),
        pool_id: bestSwap.pool_state.pool_id,
      });

      const buildResponse = await fetch(`${buildEndpoint}?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!buildResponse.ok) {
        const errorText = await buildResponse.text();
        throw new Error(`Failed to build transaction: ${errorText}`);
      }

      const unsignedTx: EIP12UnsignedTransaction = await buildResponse.json();

      // Sign transaction
      const signedTx = await context.sign_tx(unsignedTx);

      // Submit transaction
      const txId = await context.submit_tx(signedTx);

      addAlert("success", `Swap successful! Transaction ID: ${txId}`);

      // Reset form
      setFromAmount("");
      setToAmount("");
      setBestSwap(null);
    } catch (error: any) {
      console.error("Error during swap:", error);
      if (error.info) {
        addAlert("error", error.info);
      } else if (error.message) {
        addAlert("error", error.message);
      } else {
        addAlert("error", "Swap failed. Please try again.");
      }
    } finally {
      setSwapping(false);
    }
  };

  const getMinimumReceived = (): string => {
    if (!bestSwap) return "0";
    const requestedDecimals = getRequestedTokenDecimals();
    // Apply 0.5% slippage tolerance for minimum received
    const minAmount = bestSwap.swap_result.output_amount * 0.995;
    return convertFromRawAmount(Math.floor(minAmount), requestedDecimals);
  };

  const getUsdValue = (amount: string, isErgToken: boolean): string => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount === 0) return "";

    if (isErgToken) {
      if (!ergPrice) return "";
      const usdValue = numAmount * ergPrice;
      return `~$${usdValue.toFixed(2)}`;
    } else {
      if (!tokenPrice || !ergPrice) return "";
      const usdValue = numAmount * tokenPrice.asset_price_erg * ergPrice;
      return `~$${usdValue.toFixed(2)}`;
    }
  };

  if (tokenDecimals === null) {
    return (
      <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Swap
      </Typography>

      {/* From Input */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          From
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={fromAmount}
          onChange={handleFromAmountChange}
          placeholder="0.0"
          type="text"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ padding: 0, margin: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    height: "100%",
                  }}
                >
                  <Avatar
                    src={fromToken === "token" ? tokenIcon : ergIcon}
                    alt={fromTokenName}
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
                    {fromTokenName}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        {fromAmount && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: "block" }}
          >
            {getUsdValue(fromAmount, fromToken === "erg")}
          </Typography>
        )}
      </Box>

      {/* Swap Direction Button */}
      <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
        <IconButton
          onClick={handleSwapDirection}
          disabled={loading || swapping}
          sx={{
            bgcolor: theme.palette.background.default,
            border: `1px solid ${theme.palette.divider}`,
            "&:hover": {
              bgcolor: theme.palette.action.hover,
            },
          }}
        >
          <SwapVertIcon />
        </IconButton>
      </Box>

      {/* To Input */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          To
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={toAmount}
          placeholder="0.0"
          type="text"
          disabled
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ padding: 0, margin: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    height: "100%",
                  }}
                >
                  <Avatar
                    src={fromToken === "token" ? ergIcon : tokenIcon}
                    alt={toTokenName}
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
                    {toTokenName}
                  </Typography>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        {toAmount && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: "block" }}
          >
            {getUsdValue(toAmount, fromToken === "token")}
          </Typography>
        )}
      </Box>

      {/* Price Impact Display */}
      {bestSwap && (
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
                  bestSwap.swap_result.price_impact > 5
                    ? theme.palette.error.main
                    : bestSwap.swap_result.price_impact > 2
                      ? theme.palette.warning.main
                      : theme.palette.success.main,
              }}
            >
              {bestSwap.swap_result.price_impact.toFixed(2)}%
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              Minimum Received
            </Typography>
            <Typography variant="caption">
              {getMinimumReceived()} {toTokenName}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Swap Button */}
      <Button
        fullWidth
        variant="contained"
        onClick={handleSwap}
        disabled={!fromAmount || !bestSwap || loading || swapping}
        sx={{ height: 48 }}
      >
        {swapping ? (
          <CircularProgress size={24} color="inherit" />
        ) : loading ? (
          "Loading..."
        ) : !fromAmount ? (
          "Enter Amount"
        ) : !bestSwap ? (
          "No Route Found"
        ) : (
          "Swap"
        )}
      </Button>

      {/* Warning for high price impact */}
      {bestSwap && bestSwap.swap_result.price_impact > 5 && (
        <Typography
          variant="caption"
          color="error"
          sx={{ display: "block", mt: 1, textAlign: "center" }}
        >
          Warning: High price impact!
        </Typography>
      )}
    </Paper>
  );
};

export default SwapWidget;
