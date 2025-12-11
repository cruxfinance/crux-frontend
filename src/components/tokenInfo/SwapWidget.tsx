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
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
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
  fee_amount: number;
  fee_token: string;
  fee_usd: number;
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
const CRUX_TOKEN_ID =
  "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365";
const CRUX_DECIMALS = 4;

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
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [ergBalance, setErgBalance] = useState<string | null>(null);
  const [noPoolFound, setNoPoolFound] = useState<boolean>(false);
  const [feeToken, setFeeToken] = useState<"erg" | "crux">(() => {
    const savedPreference = localStorage.getItem("swapFeeTokenPreference");
    return savedPreference === "crux" || savedPreference === "erg"
      ? savedPreference
      : "erg";
  });
  const [hasAgreedToDisclaimer, setHasAgreedToDisclaimer] =
    useState<boolean>(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] =
    useState<boolean>(false);
  const [disclaimerCheckbox, setDisclaimerCheckbox] = useState<boolean>(false);

  const givenTokenId = fromToken === "token" ? tokenId : ERG_TOKEN_ID;
  const requestedTokenId = fromToken === "token" ? ERG_TOKEN_ID : tokenId;
  const fromTokenName = fromToken === "token" ? tokenTicker : "ERG";
  const toTokenName = fromToken === "token" ? "ERG" : tokenTicker;

  // Check if user has already agreed to the disclaimer
  useEffect(() => {
    const agreed = localStorage.getItem("swapDisclaimerAgreed");
    if (agreed === "true") {
      setHasAgreedToDisclaimer(true);
    }
  }, []);

  // Persist fee token preference to localStorage
  useEffect(() => {
    localStorage.setItem("swapFeeTokenPreference", feeToken);
  }, [feeToken]);

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

  // Fetch wallet balances - extracted to useCallback to prevent stale closure
  const fetchBalances = useCallback(async () => {
    try {
      if (!window.ergoConnector?.nautilus) {
        return;
      }

      const ergoCnct = window.ergoConnector.nautilus;
      const connected = await ergoCnct.connect();

      if (!connected) {
        return;
      }

      const context = await ergoCnct.getContext();

      // Fetch ERG balance
      const ergbal = await context.get_balance(ERG_TOKEN_ID);
      setErgBalance(ergbal);

      // Fetch token balance
      const tokenBal = await context.get_balance(tokenId);
      setTokenBalance(tokenBal);
    } catch (error) {
      console.error("Error fetching wallet balances:", error);
    }
  }, [tokenId]);

  // Set up balance fetching on mount and interval
  useEffect(() => {
    fetchBalances();

    // Refresh balances periodically
    const interval = setInterval(fetchBalances, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [fetchBalances]);

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
    async (amount: string, signal?: AbortSignal) => {
      if (!amount || parseFloat(amount) <= 0 || tokenDecimals === null) {
        setToAmount("");
        setBestSwap(null);
        setNoPoolFound(false);
        return;
      }

      setLoading(true);
      setNoPoolFound(false);
      try {
        const givenDecimals = getGivenTokenDecimals();
        const requestedDecimals = getRequestedTokenDecimals();
        const rawAmount = convertToRawAmount(amount, givenDecimals);

        const endpoint = `${process.env.CRUX_API}/spectrum/best_swap`;
        const params = new URLSearchParams({
          given_token_id: givenTokenId,
          given_token_amount: rawAmount.toString(),
          requested_token_id: requestedTokenId,
          fee_token: feeToken,
        });

        const response = await fetch(`${endpoint}?${params}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            setNoPoolFound(true);
            setToAmount("");
            setBestSwap(null);
            setLoading(false);
            return;
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
        // Don't show error if request was aborted
        if (error.name === "AbortError") {
          return;
        }
        console.error("Error fetching best swap:", error);
        addAlert("error", error.message || "failed to fetch swap quote");
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
      feeToken,
    ],
  );

  useEffect(() => {
    if (fromAmount && tokenDecimals !== null) {
      const abortController = new AbortController();
      const timer = setTimeout(() => {
        fetchBestSwap(fromAmount, abortController.signal);
      }, 500);

      return () => {
        clearTimeout(timer);
        abortController.abort();
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
    setNoPoolFound(false);
  };

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value);
    }
  };

  // Extracted swap execution logic without disclaimer check
  const executeSwap = async () => {
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
        fee_token: feeToken,
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

  // handleSwap checks disclaimer and calls executeSwap
  const handleSwap = async () => {
    // Check if user has agreed to disclaimer
    if (!hasAgreedToDisclaimer) {
      setShowDisclaimerDialog(true);
      return;
    }

    await executeSwap();
  };

  const handleDisclaimerAgree = async () => {
    if (disclaimerCheckbox) {
      localStorage.setItem("swapDisclaimerAgreed", "true");
      setHasAgreedToDisclaimer(true);
      setShowDisclaimerDialog(false);
      setDisclaimerCheckbox(false);
      // Execute swap directly without rechecking disclaimer
      await executeSwap();
    }
  };

  const handleDisclaimerClose = () => {
    setShowDisclaimerDialog(false);
    setDisclaimerCheckbox(false);
  };

  const getMinimumReceived = () => {
    if (!bestSwap) return "0";
    const requestedDecimals = getRequestedTokenDecimals();
    const minAmount = bestSwap.swap_result.output_amount;
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

  // Handle clicking on balance to set max amount
  const handleMaxClick = () => {
    const balance = fromToken === "token" ? tokenBalance : ergBalance;
    const decimals = fromToken === "token" ? tokenDecimals : ERG_DECIMALS;

    if (balance && decimals !== null) {
      const balanceNum = parseInt(balance, 10);
      const formattedBalance = convertFromRawAmount(balanceNum, decimals);
      setFromAmount(formattedBalance);
    }
  };

  // Format balance for display
  const getFormattedBalance = () => {
    const balance = fromToken === "token" ? tokenBalance : ergBalance;
    const decimals = fromToken === "token" ? tokenDecimals : ERG_DECIMALS;

    if (!balance || decimals === null) {
      return null;
    }

    const balanceNum = parseInt(balance, 10);
    const formatted = convertFromRawAmount(balanceNum, decimals);
    const numFormatted = parseFloat(formatted);

    // Format with appropriate precision
    if (numFormatted === 0) {
      return "0";
    } else if (numFormatted < 0.01) {
      return numFormatted.toFixed(6);
    } else if (numFormatted < 1) {
      return numFormatted.toFixed(4);
    } else {
      return numFormatted.toFixed(2);
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
    <>
      <Paper
        variant="outlined"
        sx={{ p: 2, width: "100%", position: "relative" }}
      >
        <Box sx={{ position: "relative" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Swap</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={feeToken === "crux"}
                  onChange={(e) =>
                    setFeeToken(e.target.checked ? "crux" : "erg")
                  }
                  size="small"
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  Pay fee in {feeToken === "crux" ? "CRUX" : "ERG"}
                </Typography>
              }
              labelPlacement="start"
              sx={{ m: 0 }}
            />
          </Box>

          {/* From Input */}
          <Box sx={{ mb: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                From
              </Typography>
              {getFormattedBalance() !== null && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                  onClick={handleMaxClick}
                >
                  Balance: {getFormattedBalance()} {fromTokenName}
                </Typography>
              )}
            </Box>
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                To
              </Typography>
              {(() => {
                const balance =
                  fromToken === "token" ? ergBalance : tokenBalance;
                const decimals =
                  fromToken === "token" ? ERG_DECIMALS : tokenDecimals;

                if (!balance || decimals === null) {
                  return null;
                }

                const balanceNum = parseInt(balance, 10);
                const formatted = convertFromRawAmount(balanceNum, decimals);
                const numFormatted = parseFloat(formatted);

                let formattedBalance;
                if (numFormatted === 0) {
                  formattedBalance = "0";
                } else if (numFormatted < 0.01) {
                  formattedBalance = numFormatted.toFixed(6);
                } else if (numFormatted < 1) {
                  formattedBalance = numFormatted.toFixed(4);
                } else {
                  formattedBalance = numFormatted.toFixed(2);
                }

                return (
                  <Typography variant="caption" color="text.secondary">
                    Balance: {formattedBalance} {toTokenName}
                  </Typography>
                );
              })()}
            </Box>
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

          {/* Price Impact and Fee Display */}
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
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Minimum Received
                </Typography>
                <Typography variant="caption">
                  {getMinimumReceived()} {toTokenName}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Transaction Fee
                </Typography>
                <Typography variant="caption">
                  {convertFromRawAmount(
                    bestSwap.swap_result.fee_amount,
                    bestSwap.swap_result.fee_token === "erg"
                      ? ERG_DECIMALS
                      : CRUX_DECIMALS,
                  )}{" "}
                  {bestSwap.swap_result.fee_token.toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">
                  Fee (USD)
                </Typography>
                <Typography variant="caption">
                  ${bestSwap.swap_result.fee_usd.toFixed(4)}
                </Typography>
              </Box>
            </Box>
          )}

          {/* No Pool Found Overlay */}
          {noPoolFound && fromAmount && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1,
                zIndex: 10,
              }}
            >
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ textAlign: "center", px: 3 }}
              >
                No pool found for this token pair
              </Typography>
            </Box>
          )}
        </Box>

        {/* Swap Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleSwap}
          disabled={
            !fromAmount || !bestSwap || loading || swapping || noPoolFound
          }
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

      {/* Disclaimer Dialog */}
      <Dialog
        open={showDisclaimerDialog}
        onClose={handleDisclaimerClose}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiBackdrop-root": {
            backdropFilter: "blur(3px)",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            color: theme.palette.warning.main,
          }}
        >
          ⚠️ Important Notice
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This functionality is new and can contain bugs. Whenever performing
            a swap verify the transaction details before signing the
            transaction!
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={disclaimerCheckbox}
                  onChange={(e) => setDisclaimerCheckbox(e.target.checked)}
                  sx={{
                    color: theme.palette.warning.main,
                    "&.Mui-checked": {
                      color: theme.palette.warning.main,
                    },
                  }}
                />
              }
              label="I understand and agree to proceed with caution"
            />
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2, gap: 1 }}>
          <Button
            onClick={handleDisclaimerAgree}
            variant="contained"
            disabled={!disclaimerCheckbox}
            sx={{
              minWidth: 120,
            }}
          >
            Agree & Continue
          </Button>
          <Button
            onClick={handleDisclaimerClose}
            variant="outlined"
            sx={{
              minWidth: 120,
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SwapWidget;
