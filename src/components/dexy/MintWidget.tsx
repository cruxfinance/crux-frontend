import React, {
  FC,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  Alert,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useAlert } from "@contexts/AlertContext";
import { useWallet } from "@contexts/WalletContext";
import { checkLocalIcon, getIconUrlFromServer } from "@lib/utils/icons";
import { trpc } from "@lib/trpc";

declare global {
  interface Window {
    ergoConnector: any;
  }
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
  input_amount: number;
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

type MethodType = "arbmint" | "freemint" | "lp";

// Raw constraint types (snake_case from backend)
type RawMintConstraint =
  | {
      type: "lp_rate_too_low";
      lp_rate: number;
      oracle_rate: number;
      required_margin_pct: number;
    }
  | {
      type: "tracking_delay_not_met";
      blocks_since_reset: number;
      required_blocks: number;
    }
  | {
      type: "free_mint_rate_condition_not_met";
      lp_rate: number;
      oracle_rate: number;
      rate_num: number;
      rate_denom: number;
    }
  | {
      type: "tracking_period_not_reset";
      current_height: number;
      reset_height: number;
    }
  | {
      type: "no_remaining_allowance";
      remaining: number;
    }
  | {
      type: "insufficient_bank_stablecoin";
      required: number;
      available: number;
    }
  | {
      type: "configuration_missing";
      field: string;
    }
  | {
      type: "error";
      message: string;
    };

// Raw API response types (snake_case from backend)
interface RawMintStatus {
  instance: string;
  mint_type: string;
  is_available: boolean;
  max_mint_amount: number;
  erg_required_for_max: number;
  box_state: {
    current_height: number;
    oracle_rate: number;
    lp_erg_reserves: number;
    lp_stablecoin_reserves: number;
    lp_rate: number;
    bank_erg: number;
    bank_stablecoin: number;
    tracking_r4: number;
    tracking_r5: number;
    period_blocks: number;
    tracking_delay?: number;
    threshold_percent?: number;
    bank_fee_num?: number;
    buyback_fee_num?: number;
    fee_denom?: number;
  };
  constraints: RawMintConstraint[];
  fee_amount: number;
  fee_token: string;
  fee_usd: number;
}

const ERG_TOKEN_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";
const ERG_DECIMALS = 9;
const CRUX_TOKEN_ID =
  "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365";
const CRUX_DECIMALS = 4;

const getDecimalPlaces = (value: string): number => {
  const parts = value.split(".");
  return parts.length > 1 ? parts[1].length : 0;
};

const getMinimumAmount = (decimals: number): number => {
  return 1 / Math.pow(10, decimals);
};

const MintWidget: FC = () => {
  const theme = useTheme();
  const { addAlert } = useAlert();
  const { dAppWallet } = useWallet();

  // Instance and mode state
  const [selectedInstance, setSelectedInstance] = useState<string>("USE");
  const [mode, setMode] = useState<"best" | "manual">("best");
  const [direction, setDirection] = useState<"mint" | "swap">("mint");
  const [selectedMethod, setSelectedMethod] = useState<MethodType | null>(null);

  // Amount state
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [inputMode, setInputMode] = useState<"input" | "output">("input");
  const [inputError, setInputError] = useState<string | null>(null);

  // Track the previous input mode to prevent race conditions when switching
  const prevInputModeRef = useRef<"input" | "output">(inputMode);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);

  // Quote data
  const [arbMintStatus, setArbMintStatus] = useState<RawMintStatus | null>(
    null,
  );
  const [freeMintStatus, setFreeMintStatus] = useState<RawMintStatus | null>(
    null,
  );
  const [lpSwapQuote, setLpSwapQuote] = useState<BestSwapResponse | null>(null);
  const [noPoolFound, setNoPoolFound] = useState<boolean>(false);
  const [maxMintExceeded, setMaxMintExceeded] = useState<{
    method: "arbmint" | "freemint";
    maxAmount: number;
    requestedAmount: number;
  } | null>(null);

  // Instance data
  const [stablecoinToken, setStablecoinToken] = useState<string>("");
  const [stablecoinDecimals, setStablecoinDecimals] = useState<number>(2);
  const [stablecoinIcon, setStablecoinIcon] = useState<string>("");
  const [ergIcon, setErgIcon] = useState<string>("");
  const [instanceIcons, setInstanceIcons] = useState<Record<string, string>>(
    {},
  );

  // Balances
  const [ergBalance, setErgBalance] = useState<string | null>(null);
  const [stablecoinBalance, setStablecoinBalance] = useState<string | null>(
    null,
  );

  // Prices
  const [ergPrice, setErgPrice] = useState<number | null>(null);
  const [stablecoinPrice, setStablecoinPrice] = useState<number | null>(null);

  // Fee preference
  const [feeToken, setFeeToken] = useState<"erg" | "crux">(() => {
    if (typeof window !== "undefined") {
      const savedPreference = localStorage.getItem("mintFeeTokenPreference");
      return savedPreference === "crux" || savedPreference === "erg"
        ? savedPreference
        : "erg";
    }
    return "erg";
  });

  // Disclaimer
  const [hasAgreedToDisclaimer, setHasAgreedToDisclaimer] =
    useState<boolean>(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] =
    useState<boolean>(false);
  const [disclaimerCheckbox, setDisclaimerCheckbox] = useState<boolean>(false);

  // Fetch instances
  const { data: instances, isLoading: instancesLoading } =
    trpc.dexy.getInstances.useQuery(undefined, {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    });

  // Get current instance data
  const currentInstance = instances?.find((i) => i.name === selectedInstance);

  // Persist fee token preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mintFeeTokenPreference", feeToken);
    }
  }, [feeToken]);

  // Check disclaimer
  useEffect(() => {
    if (typeof window !== "undefined") {
      const agreed = localStorage.getItem("mintDisclaimerAgreed");
      if (agreed === "true") {
        setHasAgreedToDisclaimer(true);
      }
    }
  }, []);

  // Update stablecoin token, fetch decimals and price when instance changes
  useEffect(() => {
    if (currentInstance) {
      setStablecoinToken(currentInstance.stablecoinToken);
      setStablecoinPrice(null); // Reset while loading

      // Fetch token decimals
      const fetchTokenInfo = async () => {
        try {
          const response = await fetch(
            `${process.env.CRUX_API}/crux/token_info/${currentInstance.stablecoinToken}`,
          );
          if (response.ok) {
            const data = await response.json();
            setStablecoinDecimals(data.decimals ?? 2);
          }
        } catch (error) {
          console.error("Error fetching token decimals:", error);
          setStablecoinDecimals(2); // Default fallback
        }
      };

      // Fetch stablecoin price
      const fetchPrice = async () => {
        try {
          const response = await fetch(
            `${process.env.CRUX_API}/spectrum/price?token_id=${currentInstance.stablecoinToken}`,
          );
          if (response.ok) {
            const data = await response.json();
            const usdPrice = data.asset_price_erg * data.erg_price_usd;
            setStablecoinPrice(usdPrice > 0 ? usdPrice : null);
          }
        } catch (error) {
          console.error("Error fetching stablecoin price:", error);
          setStablecoinPrice(null);
        }
      };

      fetchTokenInfo();
      fetchPrice();
    }
  }, [currentInstance]);

  // Fetch stablecoin icon
  useEffect(() => {
    const fetchIcon = async () => {
      if (!stablecoinToken) return;
      let icon = await checkLocalIcon(stablecoinToken);
      if (!icon) {
        icon = await getIconUrlFromServer(stablecoinToken);
      }
      if (icon) {
        setStablecoinIcon(icon);
      }
    };
    fetchIcon();
  }, [stablecoinToken]);

  // Fetch icons for all instances (for dropdown display)
  useEffect(() => {
    const fetchAllIcons = async () => {
      if (!instances) return;
      const iconPromises = instances.map(async (instance) => {
        let icon = await checkLocalIcon(instance.stablecoinToken);
        if (!icon) {
          icon = await getIconUrlFromServer(instance.stablecoinToken);
        }
        return { name: instance.name, icon };
      });
      const results = await Promise.all(iconPromises);
      const icons: Record<string, string> = {};
      for (const result of results) {
        if (result.icon) {
          icons[result.name] = result.icon;
        }
      }
      setInstanceIcons(icons);
    };
    fetchAllIcons();
  }, [instances]);

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

  // Fetch ERG price
  useEffect(() => {
    const fetchErgPrice = async () => {
      try {
        const endpoint = `${process.env.CRUX_API}/coingecko/erg_price`;
        const response = await fetch(endpoint);
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

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!dAppWallet.connected || !window.ergoConnector?.nautilus) return;

    try {
      const context = await window.ergoConnector.nautilus.getContext();
      const ergBal = await context.get_balance(ERG_TOKEN_ID);
      setErgBalance(ergBal);

      if (stablecoinToken) {
        const stableBal = await context.get_balance(stablecoinToken);
        setStablecoinBalance(stableBal);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [dAppWallet.connected, stablecoinToken]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // Amount conversion utilities
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

  // Calculate mint output after applying dexy protocol fees (bank_fee + buyback_fee)
  // Uses the same formula as the backend: mint = (erg * fee_denom) / (rate * total_multiplier)
  const calculateMintOutputWithFees = useCallback(
    (
      rawErgAmount: number,
      oracleRate: number,
      status: RawMintStatus | null,
    ): number => {
      // Defensive checks for invalid inputs
      if (!oracleRate || oracleRate === 0) return 0;
      if (!rawErgAmount || isNaN(rawErgAmount)) return 0;
      if (stablecoinDecimals === undefined || stablecoinDecimals === null)
        return 0;

      // Get fee parameters from box_state
      const bankFeeNum = status?.box_state?.bank_fee_num ?? 0;
      const buybackFeeNum = status?.box_state?.buyback_fee_num ?? 0;
      const feeDenom = status?.box_state?.fee_denom ?? 1000;

      // Calculate total multiplier: fee_denom + bank_fee_num + buyback_fee_num
      // This matches the backend formula where fees are added as a divisor
      const totalMultiplier = feeDenom + bankFeeNum + buybackFeeNum;

      if (totalMultiplier === 0) return 0;

      // Match backend formula:
      // mint_amount = (erg_amount * fee_denom) / (oracle_rate * total_multiplier)
      //
      // Since frontend oracle_rate is "per whole unit", we scale by decimals:
      // mint_amount = (erg_amount * fee_denom * 10^decimals) / (oracle_rate * total_multiplier)
      const divisor = oracleRate * totalMultiplier;
      if (divisor === 0) return 0;

      const mintAmount = Math.floor(
        (rawErgAmount * feeDenom * Math.pow(10, stablecoinDecimals)) / divisor,
      );

      // Final NaN check
      return isNaN(mintAmount) ? 0 : mintAmount;
    },
    [stablecoinDecimals],
  );

  // Calculate required ERG input for a desired mint output (inverse of calculateMintOutputWithFees)
  // Formula: erg_amount = (desired_mint_amount * oracle_rate * total_multiplier) / (fee_denom * 10^decimals)
  const calculateErgInputForMint = useCallback(
    (
      desiredMintAmount: number,
      oracleRate: number,
      status: RawMintStatus | null,
    ): number => {
      // Defensive checks for invalid inputs
      if (!oracleRate || oracleRate === 0) return 0;
      if (!desiredMintAmount || isNaN(desiredMintAmount)) return 0;
      if (stablecoinDecimals === undefined || stablecoinDecimals === null)
        return 0;

      // Get fee parameters from box_state
      const bankFeeNum = status?.box_state?.bank_fee_num ?? 0;
      const buybackFeeNum = status?.box_state?.buyback_fee_num ?? 0;
      const feeDenom = status?.box_state?.fee_denom ?? 1000;

      // Calculate total multiplier: fee_denom + bank_fee_num + buyback_fee_num
      const totalMultiplier = feeDenom + bankFeeNum + buybackFeeNum;

      if (feeDenom === 0 || totalMultiplier === 0) return 0;

      // Inverse formula:
      // erg_amount = (desired_mint_amount * oracle_rate * total_multiplier) / (fee_denom * 10^decimals)
      // Use ceiling to ensure user provides enough ERG
      const divisor = feeDenom * Math.pow(10, stablecoinDecimals);
      if (divisor === 0) return 0;

      const ergAmount = Math.ceil(
        (desiredMintAmount * oracleRate * totalMultiplier) / divisor,
      );

      // Final NaN check
      return isNaN(ergAmount) ? 0 : ergAmount;
    },
    [stablecoinDecimals],
  );

  // Fetch quotes when amount changes
  // selectionMode: "best" auto-selects optimal method, "manual" preserves user's selection
  const fetchQuotes = useCallback(
    async (
      amount: string,
      inputOutputMode: "input" | "output",
      selectionMode: "best" | "manual",
      signal?: AbortSignal,
    ) => {
      if (!amount || parseFloat(amount) <= 0 || !selectedInstance) {
        setArbMintStatus(null);
        setFreeMintStatus(null);
        setLpSwapQuote(null);
        if (inputOutputMode === "input") {
          setToAmount("");
        } else {
          setFromAmount("");
        }
        return;
      }

      const numericAmount = parseFloat(amount);
      // Determine decimals based on input/output mode and direction
      const amountDecimals =
        inputOutputMode === "input"
          ? direction === "mint"
            ? ERG_DECIMALS
            : stablecoinDecimals
          : direction === "mint"
            ? stablecoinDecimals
            : ERG_DECIMALS;
      const minAmount = getMinimumAmount(amountDecimals);

      if (numericAmount < minAmount) {
        setInputError(`Minimum amount is ${minAmount.toFixed(amountDecimals)}`);
        return;
      }

      setInputError(null);
      setLoading(true);
      setNoPoolFound(false);

      try {
        const rawAmount = convertToRawAmount(amount, amountDecimals);

        if (direction === "mint") {
          if (inputOutputMode === "input") {
            // Input mode: User specifies ERG, we calculate stablecoin output
            const [arbRes, freeRes, lpRes] = await Promise.all([
              fetch(
                `${process.env.CRUX_API}/dexy/mint_status/${selectedInstance}?mint_type=arb_mint&fee_token=${feeToken}`,
                { signal },
              ).then((r) => (r.ok ? r.json() : null)),
              fetch(
                `${process.env.CRUX_API}/dexy/mint_status/${selectedInstance}?mint_type=free_mint&fee_token=${feeToken}`,
                { signal },
              ).then((r) => (r.ok ? r.json() : null)),
              fetch(
                `${process.env.CRUX_API}/spectrum/best_swap?given_token_id=${ERG_TOKEN_ID}&given_token_amount=${rawAmount}&requested_token_id=${stablecoinToken}&fee_token=${feeToken}`,
                { signal },
              ).then((r) => (r.ok ? r.json() : null)),
            ]);

            setArbMintStatus(arbRes);
            setFreeMintStatus(freeRes);
            setLpSwapQuote(lpRes);

            // Calculate best output
            const outputs: {
              method: MethodType;
              output: number;
              available: boolean;
            }[] = [];

            // Reset max mint exceeded warning
            setMaxMintExceeded(null);

            if (arbRes?.is_available) {
              const oracleRate = arbRes.box_state?.oracle_rate;
              if (oracleRate) {
                const mintOutput = calculateMintOutputWithFees(
                  rawAmount,
                  oracleRate,
                  arbRes,
                );
                const maxMint = arbRes.max_mint_amount || 0;
                if (mintOutput <= maxMint) {
                  outputs.push({
                    method: "arbmint",
                    output: mintOutput,
                    available: true,
                  });
                }
              }
            }

            if (freeRes?.is_available) {
              const oracleRate = freeRes.box_state?.oracle_rate;
              if (oracleRate) {
                const mintOutput = calculateMintOutputWithFees(
                  rawAmount,
                  oracleRate,
                  freeRes,
                );
                const maxMint = freeRes.max_mint_amount || 0;
                if (mintOutput <= maxMint) {
                  outputs.push({
                    method: "freemint",
                    output: mintOutput,
                    available: true,
                  });
                }
              }
            }

            if (lpRes?.swap_result) {
              outputs.push({
                method: "lp",
                output: lpRes.swap_result.output_amount,
                available: true,
              });
            }

            // Check if mints were available but exceeded max
            const checkExceeded = (
              res: RawMintStatus | null,
              method: "arbmint" | "freemint",
            ) => {
              if (res?.is_available) {
                const oracleRate = res.box_state?.oracle_rate;
                if (oracleRate) {
                  const mintOutput = calculateMintOutputWithFees(
                    rawAmount,
                    oracleRate,
                    res,
                  );
                  const maxMint = res.max_mint_amount || 0;
                  if (mintOutput > maxMint && maxMint > 0) {
                    return {
                      method,
                      maxAmount: maxMint,
                      requestedAmount: mintOutput,
                    };
                  }
                }
              }
              return null;
            };

            const arbExceeded = checkExceeded(arbRes, "arbmint");
            const freeExceeded = checkExceeded(freeRes, "freemint");

            if (outputs.length > 0) {
              const best = outputs.reduce((a, b) =>
                a.output > b.output ? a : b,
              );

              // Only auto-select method in "best" mode
              if (selectionMode === "best") {
                setSelectedMethod(best.method);
                setToAmount(
                  convertFromRawAmount(best.output, stablecoinDecimals),
                );
              }
              // In manual mode, don't change selectedMethod - the rateComparison
              // will be updated and the UI will show correct values for each option

              if (best.method === "lp" && (arbExceeded || freeExceeded)) {
                const exceeded =
                  arbExceeded && freeExceeded
                    ? arbExceeded.maxAmount > freeExceeded.maxAmount
                      ? arbExceeded
                      : freeExceeded
                    : arbExceeded || freeExceeded;
                setMaxMintExceeded(exceeded);
              }
            } else {
              setNoPoolFound(true);
              if (selectionMode === "best") {
                setToAmount("");
              }
            }
          } else {
            // Output mode: User specifies desired stablecoin, we calculate required ERG
            // Fetch mint statuses and LP quote with requested_token_amount
            const [arbRes, freeRes, lpRes] = await Promise.all([
              fetch(
                `${process.env.CRUX_API}/dexy/mint_status/${selectedInstance}?mint_type=arb_mint&fee_token=${feeToken}`,
                { signal },
              ).then((r) => (r.ok ? r.json() : null)),
              fetch(
                `${process.env.CRUX_API}/dexy/mint_status/${selectedInstance}?mint_type=free_mint&fee_token=${feeToken}`,
                { signal },
              ).then((r) => (r.ok ? r.json() : null)),
              fetch(
                `${process.env.CRUX_API}/spectrum/best_swap?given_token_id=${ERG_TOKEN_ID}&requested_token_amount=${rawAmount}&requested_token_id=${stablecoinToken}&fee_token=${feeToken}`,
                { signal },
              ).then((r) => (r.ok ? r.json() : null)),
            ]);

            setArbMintStatus(arbRes);
            setFreeMintStatus(freeRes);
            setLpSwapQuote(lpRes);

            // Calculate required ERG for each method
            const inputs: {
              method: MethodType;
              input: number;
              available: boolean;
            }[] = [];

            setMaxMintExceeded(null);

            if (arbRes?.is_available) {
              const oracleRate = arbRes.box_state?.oracle_rate;
              if (oracleRate) {
                const requiredErg = calculateErgInputForMint(
                  rawAmount,
                  oracleRate,
                  arbRes,
                );
                const maxMint = arbRes.max_mint_amount || 0;
                // Check if desired output exceeds max mint
                if (rawAmount <= maxMint) {
                  inputs.push({
                    method: "arbmint",
                    input: requiredErg,
                    available: true,
                  });
                }
              }
            }

            if (freeRes?.is_available) {
              const oracleRate = freeRes.box_state?.oracle_rate;
              if (oracleRate) {
                const requiredErg = calculateErgInputForMint(
                  rawAmount,
                  oracleRate,
                  freeRes,
                );
                const maxMint = freeRes.max_mint_amount || 0;
                if (rawAmount <= maxMint) {
                  inputs.push({
                    method: "freemint",
                    input: requiredErg,
                    available: true,
                  });
                }
              }
            }

            if (lpRes?.swap_result) {
              inputs.push({
                method: "lp",
                input: lpRes.swap_result.input_amount,
                available: true,
              });
            }

            // Select method with lowest required input (best deal for user)
            if (inputs.length > 0) {
              const best = inputs.reduce((a, b) => (a.input < b.input ? a : b));

              // Only auto-select method in "best" mode
              if (selectionMode === "best") {
                setSelectedMethod(best.method);
                setFromAmount(convertFromRawAmount(best.input, ERG_DECIMALS));
              }
              // In manual mode, don't change selectedMethod - the rateComparison
              // will be updated and the UI will show correct values for each option
            } else {
              setNoPoolFound(true);
              if (selectionMode === "best") {
                setFromAmount("");
              }
            }
          }
        } else {
          // Swap direction: stablecoin -> ERG (LP only)
          if (inputOutputMode === "input") {
            const lpRes = await fetch(
              `${process.env.CRUX_API}/spectrum/best_swap?given_token_id=${stablecoinToken}&given_token_amount=${rawAmount}&requested_token_id=${ERG_TOKEN_ID}&fee_token=${feeToken}`,
              { signal },
            );

            if (lpRes.ok) {
              const data = await lpRes.json();
              setLpSwapQuote(data);
              setSelectedMethod("lp");
              setToAmount(
                convertFromRawAmount(
                  data.swap_result.output_amount,
                  ERG_DECIMALS,
                ),
              );
            } else if (lpRes.status === 404) {
              setNoPoolFound(true);
              setToAmount("");
            }
          } else {
            // Output mode for swap: user specifies ERG output, calculate stablecoin input
            const lpRes = await fetch(
              `${process.env.CRUX_API}/spectrum/best_swap?given_token_id=${stablecoinToken}&requested_token_amount=${rawAmount}&requested_token_id=${ERG_TOKEN_ID}&fee_token=${feeToken}`,
              { signal },
            );

            if (lpRes.ok) {
              const data = await lpRes.json();
              setLpSwapQuote(data);
              setSelectedMethod("lp");
              setFromAmount(
                convertFromRawAmount(
                  data.swap_result.input_amount,
                  stablecoinDecimals,
                ),
              );
            } else if (lpRes.status === 404) {
              setNoPoolFound(true);
              setFromAmount("");
            }
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Error fetching quotes:", error);
        addAlert("error", "Failed to fetch quotes");
      } finally {
        setLoading(false);
      }
    },
    [
      selectedInstance,
      direction,
      stablecoinToken,
      stablecoinDecimals,
      feeToken,
      convertToRawAmount,
      convertFromRawAmount,
      calculateMintOutputWithFees,
      calculateErgInputForMint,
      addAlert,
    ],
  );

  // Debounced quote fetching
  useEffect(() => {
    // Detect if input mode just changed to prevent double-fetching
    const modeJustChanged = prevInputModeRef.current !== inputMode;
    prevInputModeRef.current = inputMode;

    // If mode just changed, skip this effect cycle - the amount change will trigger it
    if (modeJustChanged) {
      return;
    }

    const amount = inputMode === "input" ? fromAmount : toAmount;
    if (amount) {
      const abortController = new AbortController();
      const timer = setTimeout(() => {
        fetchQuotes(amount, inputMode, mode, abortController.signal);
      }, 500);

      return () => {
        clearTimeout(timer);
        abortController.abort();
      };
    } else {
      if (inputMode === "input") {
        setToAmount("");
      } else {
        setFromAmount("");
      }
      setArbMintStatus(null);
      setFreeMintStatus(null);
      setLpSwapQuote(null);
    }
  }, [fromAmount, toAmount, inputMode, mode, fetchQuotes]);

  // Handle direction flip
  const handleDirectionFlip = () => {
    setDirection(direction === "mint" ? "swap" : "mint");
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setInputMode("input");
    setArbMintStatus(null);
    setFreeMintStatus(null);
    setLpSwapQuote(null);
    setSelectedMethod(null);
    setInputError(null);
  };

  // Handle amount input
  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Switch to input mode when user types in "From" field
    if (inputMode !== "input") {
      setInputMode("input");
      // Clear any errors from the previous mode
      setInputError(null);
    }

    if (value === "") {
      setFromAmount(value);
      setInputError(null);
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) return;

    const decimals = direction === "mint" ? ERG_DECIMALS : stablecoinDecimals;
    if (getDecimalPlaces(value) > decimals) {
      setInputError(`Maximum ${decimals} decimal places allowed`);
      return;
    }

    setFromAmount(value);
    setInputError(null);
  };

  // Handle output amount input
  const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Switch to output mode when user types in "To" field
    if (inputMode !== "output") {
      setInputMode("output");
      // Clear any errors from the previous mode
      setInputError(null);
    }

    if (value === "") {
      setToAmount(value);
      setInputError(null);
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) return;

    const decimals = direction === "mint" ? stablecoinDecimals : ERG_DECIMALS;
    if (getDecimalPlaces(value) > decimals) {
      setInputError(`Maximum ${decimals} decimal places allowed`);
      return;
    }

    setToAmount(value);
    setInputError(null);
  };

  // Handle max click
  const handleMaxClick = () => {
    const balance = direction === "mint" ? ergBalance : stablecoinBalance;
    const decimals = direction === "mint" ? ERG_DECIMALS : stablecoinDecimals;

    if (!balance) return;

    const balanceNum = parseInt(balance, 10);
    setFromAmount(convertFromRawAmount(balanceNum, decimals));
    setInputMode("input");
  };

  // Execute mint/swap
  const executeMint = async () => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }

    if (!fromAmount || fromAmount === "0") {
      addAlert("error", "Please enter an amount");
      return;
    }

    if (inputError) {
      addAlert("error", inputError);
      return;
    }

    if (!selectedMethod) {
      addAlert("error", "No method available");
      return;
    }

    setMinting(true);

    try {
      const context = await window.ergoConnector.nautilus.getContext();
      const changeAddress = await context.get_change_address();
      const usedAddresses = await context.get_used_addresses();
      const unusedAddresses = await context.get_unused_addresses();
      const allAddresses = [
        changeAddress,
        ...usedAddresses,
        ...unusedAddresses,
      ];
      const userAddresses = [...new Set(allAddresses)].join(",");

      let unsignedTx: EIP12UnsignedTransaction;

      if (selectedMethod === "lp") {
        // Use LP swap
        const fromDecimals =
          direction === "mint" ? ERG_DECIMALS : stablecoinDecimals;
        // In output mode, use the input_amount from the API response
        const rawAmount =
          inputMode === "output" && lpSwapQuote?.swap_result
            ? lpSwapQuote.swap_result.input_amount
            : convertToRawAmount(fromAmount, fromDecimals);
        const givenTokenId =
          direction === "mint" ? ERG_TOKEN_ID : stablecoinToken;
        const poolId = lpSwapQuote?.pool_state?.pool_id;

        if (!poolId) {
          addAlert("error", "No pool available");
          setMinting(false);
          return;
        }

        const buildRes = await fetch(
          `${process.env.CRUX_API}/spectrum/build_swap_tx?user_addresses=${userAddresses}&target_address=${changeAddress}&given_token_id=${givenTokenId}&given_token_amount=${rawAmount}&pool_id=${poolId}&fee_token=${feeToken}`,
        );

        if (!buildRes.ok) {
          const errorText = await buildRes.text();
          throw new Error(`Failed to build transaction: ${errorText}`);
        }

        unsignedTx = await buildRes.json();
      } else {
        // Use mint
        // In output mode, use the calculated ERG input from fromAmount (already populated by fetchQuotes)
        const rawAmount = convertToRawAmount(fromAmount, ERG_DECIMALS);
        // Convert method name to API format (arbmint -> arb_mint, freemint -> free_mint)
        const apiMintType =
          selectedMethod === "arbmint" ? "arb_mint" : "free_mint";

        const params = new URLSearchParams({
          mint_type: apiMintType,
          user_addresses: userAddresses,
          target_address: changeAddress,
          erg_amount: rawAmount.toString(),
          fee_token: feeToken,
        });

        const buildRes = await fetch(
          `${process.env.CRUX_API}/dexy/build_mint_tx/${selectedInstance}?${params}`,
        );

        if (!buildRes.ok) {
          const errorText = await buildRes.text();
          throw new Error(`Failed to build transaction: ${errorText}`);
        }

        const data = await buildRes.json();
        unsignedTx = data.transaction;
      }

      const signedTx = await context.sign_tx(unsignedTx);
      const txId = await context.submit_tx(signedTx);

      addAlert(
        "success",
        `${selectedMethod === "lp" ? "Swap" : "Mint"} successful! TX: ${txId}`,
      );

      setFromAmount("");
      setToAmount("");
      setArbMintStatus(null);
      setFreeMintStatus(null);
      setLpSwapQuote(null);
      setSelectedMethod(null);
    } catch (error: any) {
      console.error("Error during mint/swap:", error);
      addAlert("error", error.info || error.message || "Transaction failed");
    } finally {
      setMinting(false);
    }
  };

  const handleMint = async () => {
    if (!hasAgreedToDisclaimer) {
      setShowDisclaimerDialog(true);
      return;
    }
    await executeMint();
  };

  const handleDisclaimerAgree = async () => {
    if (disclaimerCheckbox) {
      localStorage.setItem("mintDisclaimerAgreed", "true");
      setHasAgreedToDisclaimer(true);
      setShowDisclaimerDialog(false);
      setDisclaimerCheckbox(false);
      await executeMint();
    }
  };

  // Calculate rate comparison (memoized)
  // Includes both output and input amounts so method selection can update the correct field
  const rateComparison = useMemo(() => {
    if (!lpSwapQuote?.swap_result || direction !== "mint") return null;

    const lpOutput = lpSwapQuote.swap_result.output_amount;
    const lpInput = lpSwapQuote.swap_result.input_amount;
    // Protect against division by zero
    if (lpOutput === 0) return null;

    const results: {
      method: MethodType;
      output: number;
      input: number;
      diff: number;
    }[] = [];

    // Get raw amounts based on input mode
    const rawFromAmount = convertToRawAmount(fromAmount, ERG_DECIMALS);
    const rawToAmount = convertToRawAmount(toAmount, stablecoinDecimals);

    if (arbMintStatus?.is_available) {
      const oracleRate = arbMintStatus.box_state?.oracle_rate;
      if (oracleRate && oracleRate > 0) {
        if (inputMode === "input" && rawFromAmount > 0) {
          // Calculate output from input
          const mintOutput = calculateMintOutputWithFees(
            rawFromAmount,
            oracleRate,
            arbMintStatus,
          );
          const diff = ((mintOutput - lpOutput) / lpOutput) * 100;
          results.push({
            method: "arbmint",
            output: mintOutput,
            input: rawFromAmount,
            diff,
          });
        } else if (inputMode === "output" && rawToAmount > 0) {
          // Calculate input from output
          const requiredInput = calculateErgInputForMint(
            rawToAmount,
            oracleRate,
            arbMintStatus,
          );
          const diff = ((lpInput - requiredInput) / lpInput) * 100;
          results.push({
            method: "arbmint",
            output: rawToAmount,
            input: requiredInput,
            diff,
          });
        }
      }
    }

    if (freeMintStatus?.is_available) {
      const oracleRate = freeMintStatus.box_state?.oracle_rate;
      if (oracleRate && oracleRate > 0) {
        if (inputMode === "input" && rawFromAmount > 0) {
          // Calculate output from input
          const mintOutput = calculateMintOutputWithFees(
            rawFromAmount,
            oracleRate,
            freeMintStatus,
          );
          const diff = ((mintOutput - lpOutput) / lpOutput) * 100;
          results.push({
            method: "freemint",
            output: mintOutput,
            input: rawFromAmount,
            diff,
          });
        } else if (inputMode === "output" && rawToAmount > 0) {
          // Calculate input from output
          const requiredInput = calculateErgInputForMint(
            rawToAmount,
            oracleRate,
            freeMintStatus,
          );
          const diff = ((lpInput - requiredInput) / lpInput) * 100;
          results.push({
            method: "freemint",
            output: rawToAmount,
            input: requiredInput,
            diff,
          });
        }
      }
    }

    // LP swap - use values from API response
    if (inputMode === "input") {
      results.push({
        method: "lp",
        output: lpOutput,
        input: rawFromAmount,
        diff: 0,
      });
    } else {
      results.push({
        method: "lp",
        output: rawToAmount,
        input: lpInput,
        diff: 0,
      });
    }

    return results;
  }, [
    lpSwapQuote,
    direction,
    fromAmount,
    toAmount,
    inputMode,
    arbMintStatus,
    freeMintStatus,
    stablecoinDecimals,
    convertToRawAmount,
    calculateMintOutputWithFees,
    calculateErgInputForMint,
  ]);

  // Format balance for display
  const formatBalance = (
    balance: string | null,
    decimals: number,
  ): string | null => {
    if (!balance) return null;
    const num = parseInt(balance, 10) / Math.pow(10, decimals);
    if (num === 0) return "0";
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(2);
  };

  // Get USD value
  const getUsdValue = (amount: string, isErg: boolean): string => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num === 0) return "";

    if (isErg) {
      if (!ergPrice) return "";
      return `~$${(num * ergPrice).toFixed(2)}`;
    } else {
      // Use fetched stablecoin price
      if (!stablecoinPrice) return "";
      return `~$${(num * stablecoinPrice).toFixed(2)}`;
    }
  };

  // Get reset countdown for mint periods
  const getResetCountdown = (): string | null => {
    // Use freemint status as primary source (both should have same period info)
    const status = freeMintStatus || arbMintStatus;
    if (!status?.box_state) return null;

    const { current_height, tracking_r4, period_blocks } = status.box_state;
    if (!period_blocks || !tracking_r4) return null;

    // tracking_r4 contains the height when tracking started
    // Calculate blocks into current period using modulo
    const blocksSinceTracking = current_height - tracking_r4;
    const blocksIntoPeriod = blocksSinceTracking % period_blocks;
    const blocksUntilReset = period_blocks - blocksIntoPeriod;

    if (blocksUntilReset <= 0 || blocksUntilReset > period_blocks) return null;

    // 1 block ≈ 2 minutes
    const minutesUntilReset = blocksUntilReset * 2;
    const hours = Math.floor(minutesUntilReset / 60);
    const minutes = minutesUntilReset % 60;

    if (hours > 0) {
      return `~${hours}h ${minutes}m`;
    }
    return `~${minutes}m`;
  };

  // Get max mint amount display
  const getMaxMintDisplay = (status: RawMintStatus | null): string | null => {
    if (!status?.is_available || !status.max_mint_amount) return null;
    return convertFromRawAmount(status.max_mint_amount, stablecoinDecimals);
  };

  // Get human-readable reason for mint unavailability
  const getMintUnavailableReason = (
    status: RawMintStatus | null,
    mintType: "ArbMint" | "FreeMint",
  ): string => {
    if (!status) return `${mintType} not available`;
    if (status.is_available) return "";

    const constraints = status.constraints;
    if (!constraints || constraints.length === 0) {
      return `${mintType} not available`;
    }

    // Get the first constraint and format it
    const constraint = constraints[0];
    switch (constraint.type) {
      case "lp_rate_too_low": {
        // Show percentage difference instead of raw rates
        // Check if rates are in similar scale (within 1000x of each other)
        const ratio = constraint.oracle_rate / constraint.lp_rate;
        if (ratio > 1000 || ratio < 0.001) {
          // Rates are in different scales - likely a backend issue, show simple message
          return `LP rate too low for ${mintType} (need +${constraint.required_margin_pct}% above oracle)`;
        }
        const pctDiff =
          ((constraint.oracle_rate - constraint.lp_rate) /
            constraint.oracle_rate) *
          100;
        return `LP rate ${pctDiff.toFixed(2)}% below oracle rate (need +${constraint.required_margin_pct}% margin)`;
      }
      case "tracking_delay_not_met":
        return `Wait ${constraint.required_blocks - constraint.blocks_since_reset} more blocks (tracking delay)`;
      case "free_mint_rate_condition_not_met": {
        const requiredPct = (constraint.rate_num / constraint.rate_denom) * 100;
        const actualPct = (constraint.lp_rate / constraint.oracle_rate) * 100;
        return `LP rate at ${actualPct.toFixed(1)}% of oracle (need ≥${requiredPct.toFixed(1)}%)`;
      }
      case "tracking_period_not_reset":
        return `Period not reset yet (resets at block ${constraint.reset_height})`;
      case "no_remaining_allowance":
        return "No remaining mint allowance this period";
      case "insufficient_bank_stablecoin":
        return `Insufficient bank reserves (need ${convertFromRawAmount(constraint.required, stablecoinDecimals)}, have ${convertFromRawAmount(constraint.available, stablecoinDecimals)})`;
      case "configuration_missing":
        return `Configuration missing: ${constraint.field}`;
      case "error":
        return constraint.message || `${mintType} error`;
      default:
        console.warn("Unknown mint constraint type:", (constraint as any).type);
        return `${mintType} not available`;
    }
  };

  // Check if mint would exceed max amount
  const checkMintExceedingMax = useCallback(
    (status: RawMintStatus | null): boolean => {
      if (!status?.is_available || !fromAmount) return false;
      const oracleRate = status.box_state?.oracle_rate;
      if (!oracleRate) return false;
      const rawAmount = convertToRawAmount(fromAmount, ERG_DECIMALS);
      const mintOutput = calculateMintOutputWithFees(
        rawAmount,
        oracleRate,
        status,
      );
      const maxMint = status.max_mint_amount || 0;
      return mintOutput > maxMint && maxMint > 0;
    },
    [fromAmount, convertToRawAmount, calculateMintOutputWithFees],
  );

  // Memoized values for mint exceeding max
  const arbMintExceedsMax = useMemo(
    () => checkMintExceedingMax(arbMintStatus),
    [checkMintExceedingMax, arbMintStatus],
  );

  const freeMintExceedsMax = useMemo(
    () => checkMintExceedingMax(freeMintStatus),
    [checkMintExceedingMax, freeMintStatus],
  );

  // Get fee display
  const getFeeDisplay = () => {
    if (selectedMethod === "lp" && lpSwapQuote?.swap_result) {
      const fee = lpSwapQuote.swap_result.fee_amount;
      const token = lpSwapQuote.swap_result.fee_token;
      const usd = lpSwapQuote.swap_result.fee_usd;
      const decimals = token === "erg" ? ERG_DECIMALS : CRUX_DECIMALS;
      return `${convertFromRawAmount(fee, decimals)} ${token.toUpperCase()} (~$${usd.toFixed(4)})`;
    }

    if (selectedMethod === "arbmint" && arbMintStatus) {
      const fee = arbMintStatus.fee_amount || 0;
      const token = arbMintStatus.fee_token || "erg";
      const usd = arbMintStatus.fee_usd || 0;
      const decimals = token === "erg" ? ERG_DECIMALS : CRUX_DECIMALS;
      return `${convertFromRawAmount(fee, decimals)} ${token.toUpperCase()} (~$${usd.toFixed(4)})`;
    }

    if (selectedMethod === "freemint" && freeMintStatus) {
      const fee = freeMintStatus.fee_amount || 0;
      const token = freeMintStatus.fee_token || "erg";
      const usd = freeMintStatus.fee_usd || 0;
      const decimals = token === "erg" ? ERG_DECIMALS : CRUX_DECIMALS;
      return `${convertFromRawAmount(fee, decimals)} ${token.toUpperCase()} (~$${usd.toFixed(4)})`;
    }

    return null;
  };

  const fromTokenName = direction === "mint" ? "ERG" : selectedInstance;
  const toTokenName = direction === "mint" ? selectedInstance : "ERG";
  const fromIcon = direction === "mint" ? ergIcon : stablecoinIcon;
  const toIcon = direction === "mint" ? stablecoinIcon : ergIcon;

  if (instancesLoading) {
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
          {/* Header with instance selector and fee toggle */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                displayEmpty
                renderValue={(value) => (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {instanceIcons[value] && (
                      <Avatar
                        src={instanceIcons[value]}
                        alt={value}
                        sx={{ width: 20, height: 20 }}
                      />
                    )}
                    <span>{value}</span>
                  </Box>
                )}
              >
                {instances?.map((instance) => (
                  <MenuItem
                    key={instance.id}
                    value={instance.name}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    {instanceIcons[instance.name] && (
                      <Avatar
                        src={instanceIcons[instance.name]}
                        alt={instance.name}
                        sx={{ width: 20, height: 20 }}
                      />
                    )}
                    <span>{instance.name}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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

          {/* Mode toggle (only show in mint direction) */}
          {direction === "mint" && (
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, newMode) => newMode && setMode(newMode)}
                size="small"
                fullWidth
              >
                <ToggleButton value="best">Best Available</ToggleButton>
                <ToggleButton value="manual">Manual</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

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
              {(direction === "mint"
                ? formatBalance(ergBalance, ERG_DECIMALS)
                : formatBalance(stablecoinBalance, stablecoinDecimals)) && (
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
                  {direction === "mint"
                    ? formatBalance(ergBalance, ERG_DECIMALS)
                    : formatBalance(stablecoinBalance, stablecoinDecimals)}{" "}
                  {fromTokenName}
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
                startAdornment:
                  loading && inputMode === "output" ? (
                    <InputAdornment position="start">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : null,
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={fromIcon}
                        alt={fromTokenName}
                        sx={{ width: 24, height: 24 }}
                      />
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {fromTokenName}
                      </Typography>
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
            {inputError && inputMode === "input" && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, display: "block" }}
              >
                {inputError}
              </Typography>
            )}
            {fromAmount && !inputError && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {getUsdValue(fromAmount, direction === "mint")}
              </Typography>
            )}
          </Box>

          {/* Swap Direction Button */}
          <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
            <IconButton
              onClick={handleDirectionFlip}
              disabled={loading || minting}
              sx={{
                bgcolor: theme.palette.background.default,
                border: `1px solid ${theme.palette.divider}`,
                "&:hover": { bgcolor: theme.palette.action.hover },
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
              {(direction === "mint"
                ? formatBalance(stablecoinBalance, stablecoinDecimals)
                : formatBalance(ergBalance, ERG_DECIMALS)) && (
                <Typography variant="caption" color="text.secondary">
                  Balance:{" "}
                  {direction === "mint"
                    ? formatBalance(stablecoinBalance, stablecoinDecimals)
                    : formatBalance(ergBalance, ERG_DECIMALS)}{" "}
                  {toTokenName}
                </Typography>
              )}
            </Box>
            <TextField
              fullWidth
              variant="outlined"
              value={toAmount}
              onChange={handleToAmountChange}
              placeholder="0.0"
              type="text"
              InputProps={{
                startAdornment:
                  loading && inputMode === "input" ? (
                    <InputAdornment position="start">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : null,
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={toIcon}
                        alt={toTokenName}
                        sx={{ width: 24, height: 24 }}
                      />
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {toTokenName}
                      </Typography>
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
            {inputError && inputMode === "output" && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, display: "block" }}
              >
                {inputError}
              </Typography>
            )}
            {toAmount && !inputError && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {getUsdValue(toAmount, direction !== "mint")}
              </Typography>
            )}
          </Box>

          {/* Method selection / info */}
          {direction === "mint" && (fromAmount || toAmount) && !loading && (
            <Box sx={{ mb: 2 }}>
              {mode === "best" && selectedMethod && (
                <Box
                  sx={{
                    p: 1.5,
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
                      Method
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {selectedMethod === "arbmint"
                        ? "ArbMint"
                        : selectedMethod === "freemint"
                          ? "FreeMint"
                          : "LP Swap"}
                      {rateComparison?.find((r) => r.method === selectedMethod)
                        ?.diff !== 0 && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            ml: 1,
                            color:
                              (rateComparison?.find(
                                (r) => r.method === selectedMethod,
                              )?.diff || 0) > 0
                                ? theme.palette.success.main
                                : theme.palette.error.main,
                          }}
                        >
                          {(rateComparison?.find(
                            (r) => r.method === selectedMethod,
                          )?.diff || 0) > 0
                            ? "+"
                            : ""}
                          {rateComparison
                            ?.find((r) => r.method === selectedMethod)
                            ?.diff.toFixed(2)}
                          % vs LP
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      You receive
                    </Typography>
                    <Typography variant="caption">
                      {toAmount} {toTokenName}
                    </Typography>
                  </Box>
                </Box>
              )}

              {mode === "manual" && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {/* ArbMint option */}
                  <Tooltip
                    title={
                      !arbMintStatus?.is_available
                        ? getMintUnavailableReason(arbMintStatus, "ArbMint")
                        : arbMintExceedsMax
                          ? `Exceeds max (${getMaxMintDisplay(arbMintStatus)} ${currentInstance?.name || selectedInstance})`
                          : ""
                    }
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 100,
                        p: 1.5,
                        borderRadius: 1,
                        border: `2px solid ${
                          selectedMethod === "arbmint"
                            ? theme.palette.primary.main
                            : theme.palette.divider
                        }`,
                        bgcolor:
                          selectedMethod === "arbmint"
                            ? theme.palette.action.selected
                            : "transparent",
                        opacity:
                          arbMintStatus?.is_available && !arbMintExceedsMax
                            ? 1
                            : 0.5,
                        cursor:
                          arbMintStatus?.is_available && !arbMintExceedsMax
                            ? "pointer"
                            : "not-allowed",
                        textAlign: "center",
                      }}
                      onClick={() => {
                        if (arbMintStatus?.is_available && !arbMintExceedsMax) {
                          setSelectedMethod("arbmint");
                          const comparison = rateComparison?.find(
                            (r) => r.method === "arbmint",
                          );
                          if (comparison) {
                            if (inputMode === "input") {
                              // User specified input, update output
                              setToAmount(
                                convertFromRawAmount(
                                  comparison.output,
                                  stablecoinDecimals,
                                ),
                              );
                            } else {
                              // User specified output, update required input
                              setFromAmount(
                                convertFromRawAmount(
                                  comparison.input,
                                  ERG_DECIMALS,
                                ),
                              );
                            }
                          }
                        }
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mb: 0.5 }}
                      >
                        ArbMint
                      </Typography>
                      <Typography variant="caption" display="block">
                        {rateComparison?.find((r) => r.method === "arbmint")
                          ? `${convertFromRawAmount(
                              rateComparison!.find(
                                (r) => r.method === "arbmint",
                              )!.input,
                              ERG_DECIMALS,
                            )} ${fromTokenName} → ${convertFromRawAmount(
                              rateComparison!.find(
                                (r) => r.method === "arbmint",
                              )!.output,
                              stablecoinDecimals,
                            )} ${toTokenName}`
                          : "-"}
                      </Typography>
                      {rateComparison?.find((r) => r.method === "arbmint")
                        ?.diff !== undefined && (
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              (rateComparison?.find(
                                (r) => r.method === "arbmint",
                              )?.diff || 0) > 0
                                ? theme.palette.success.main
                                : (rateComparison?.find(
                                      (r) => r.method === "arbmint",
                                    )?.diff || 0) < 0
                                  ? theme.palette.error.main
                                  : theme.palette.text.secondary,
                          }}
                        >
                          {(() => {
                            const diff =
                              rateComparison?.find(
                                (r) => r.method === "arbmint",
                              )?.diff || 0;
                            if (diff > 0) return `+${diff.toFixed(2)}%`;
                            if (diff < 0) return `${diff.toFixed(2)}%`;
                            return "baseline";
                          })()}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>

                  {/* FreeMint option */}
                  <Tooltip
                    title={
                      !freeMintStatus?.is_available
                        ? getMintUnavailableReason(freeMintStatus, "FreeMint")
                        : freeMintExceedsMax
                          ? `Exceeds max (${getMaxMintDisplay(freeMintStatus)} ${currentInstance?.name || selectedInstance})`
                          : ""
                    }
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 100,
                        p: 1.5,
                        borderRadius: 1,
                        border: `2px solid ${
                          selectedMethod === "freemint"
                            ? theme.palette.primary.main
                            : theme.palette.divider
                        }`,
                        bgcolor:
                          selectedMethod === "freemint"
                            ? theme.palette.action.selected
                            : "transparent",
                        opacity:
                          freeMintStatus?.is_available && !freeMintExceedsMax
                            ? 1
                            : 0.5,
                        cursor:
                          freeMintStatus?.is_available && !freeMintExceedsMax
                            ? "pointer"
                            : "not-allowed",
                        textAlign: "center",
                      }}
                      onClick={() => {
                        if (
                          freeMintStatus?.is_available &&
                          !freeMintExceedsMax
                        ) {
                          setSelectedMethod("freemint");
                          const comparison = rateComparison?.find(
                            (r) => r.method === "freemint",
                          );
                          if (comparison) {
                            if (inputMode === "input") {
                              // User specified input, update output
                              setToAmount(
                                convertFromRawAmount(
                                  comparison.output,
                                  stablecoinDecimals,
                                ),
                              );
                            } else {
                              // User specified output, update required input
                              setFromAmount(
                                convertFromRawAmount(
                                  comparison.input,
                                  ERG_DECIMALS,
                                ),
                              );
                            }
                          }
                        }
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mb: 0.5 }}
                      >
                        FreeMint
                      </Typography>
                      <Typography variant="caption" display="block">
                        {rateComparison?.find((r) => r.method === "freemint")
                          ? `${convertFromRawAmount(
                              rateComparison!.find(
                                (r) => r.method === "freemint",
                              )!.input,
                              ERG_DECIMALS,
                            )} ${fromTokenName} → ${convertFromRawAmount(
                              rateComparison!.find(
                                (r) => r.method === "freemint",
                              )!.output,
                              stablecoinDecimals,
                            )} ${toTokenName}`
                          : "-"}
                      </Typography>
                      {rateComparison?.find((r) => r.method === "freemint")
                        ?.diff !== undefined && (
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              (rateComparison?.find(
                                (r) => r.method === "freemint",
                              )?.diff || 0) > 0
                                ? theme.palette.success.main
                                : (rateComparison?.find(
                                      (r) => r.method === "freemint",
                                    )?.diff || 0) < 0
                                  ? theme.palette.error.main
                                  : theme.palette.text.secondary,
                          }}
                        >
                          {(() => {
                            const diff =
                              rateComparison?.find(
                                (r) => r.method === "freemint",
                              )?.diff || 0;
                            if (diff > 0) return `+${diff.toFixed(2)}%`;
                            if (diff < 0) return `${diff.toFixed(2)}%`;
                            return "baseline";
                          })()}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>

                  {/* LP Swap option */}
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      p: 1.5,
                      borderRadius: 1,
                      border: `2px solid ${
                        selectedMethod === "lp"
                          ? theme.palette.primary.main
                          : theme.palette.divider
                      }`,
                      bgcolor:
                        selectedMethod === "lp"
                          ? theme.palette.action.selected
                          : "transparent",
                      opacity: lpSwapQuote ? 1 : 0.5,
                      cursor: lpSwapQuote ? "pointer" : "not-allowed",
                      textAlign: "center",
                    }}
                    onClick={() => {
                      if (lpSwapQuote) {
                        setSelectedMethod("lp");
                        if (inputMode === "input") {
                          // User specified input, update output
                          setToAmount(
                            convertFromRawAmount(
                              lpSwapQuote.swap_result.output_amount,
                              stablecoinDecimals,
                            ),
                          );
                        } else {
                          // User specified output, update required input
                          setFromAmount(
                            convertFromRawAmount(
                              lpSwapQuote.swap_result.input_amount,
                              ERG_DECIMALS,
                            ),
                          );
                        }
                      }
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      LP Swap
                    </Typography>
                    <Typography variant="caption" display="block">
                      {lpSwapQuote
                        ? `${convertFromRawAmount(
                            lpSwapQuote.swap_result.input_amount,
                            ERG_DECIMALS,
                          )} ${fromTokenName} → ${convertFromRawAmount(
                            lpSwapQuote.swap_result.output_amount,
                            stablecoinDecimals,
                          )} ${toTokenName}`
                        : "-"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      baseline
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Max mint exceeded warning */}
          {maxMintExceeded && (
            <Alert
              severity="warning"
              icon={<WarningAmberIcon fontSize="small" />}
              sx={{ mb: 2 }}
            >
              {maxMintExceeded.method === "arbmint" ? "ArbMint" : "FreeMint"}{" "}
              max is{" "}
              {convertFromRawAmount(
                maxMintExceeded.maxAmount,
                stablecoinDecimals,
              )}{" "}
              {currentInstance?.name || selectedInstance}. Using LP Swap
              instead.
            </Alert>
          )}

          {/* Mint info: max amounts and reset timer */}
          {direction === "mint" &&
            (arbMintStatus?.is_available || freeMintStatus?.is_available) && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                }}
              >
                {arbMintStatus?.is_available && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: freeMintStatus?.is_available ? 0.5 : 0,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      ArbMint Max
                    </Typography>
                    <Typography variant="caption">
                      {getMaxMintDisplay(arbMintStatus)}{" "}
                      {currentInstance?.name || selectedInstance}
                    </Typography>
                  </Box>
                )}
                {freeMintStatus?.is_available && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: getResetCountdown() ? 0.5 : 0,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      FreeMint Max
                    </Typography>
                    <Typography variant="caption">
                      {getMaxMintDisplay(freeMintStatus)}{" "}
                      {currentInstance?.name || selectedInstance}
                    </Typography>
                  </Box>
                )}
                {getResetCountdown() && (
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Period Resets In
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {getResetCountdown()}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

          {/* Fee display */}
          {getFeeDisplay() && (
            <Box
              sx={{
                mb: 2,
                p: 1,
                bgcolor: theme.palette.background.default,
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">
                  Service Fee
                </Typography>
                <Typography variant="caption">{getFeeDisplay()}</Typography>
              </Box>
            </Box>
          )}

          {/* No pool overlay */}
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
                No {direction === "mint" ? "mint or swap" : "swap"} available
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleMint}
          disabled={
            !fromAmount || !selectedMethod || loading || minting || noPoolFound
          }
          sx={{ height: 48 }}
        >
          {minting ? (
            <CircularProgress size={24} color="inherit" />
          ) : loading ? (
            "Loading..."
          ) : !fromAmount ? (
            "Enter Amount"
          ) : !selectedMethod ? (
            "No Route Found"
          ) : direction === "mint" ? (
            selectedMethod === "lp" ? (
              "Swap"
            ) : (
              "Mint"
            )
          ) : (
            "Swap"
          )}
        </Button>
      </Paper>

      {/* Disclaimer Dialog */}
      <Dialog
        open={showDisclaimerDialog}
        onClose={() => setShowDisclaimerDialog(false)}
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
          sx={{ fontWeight: 600, color: theme.palette.warning.main }}
        >
          Important Notice
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This functionality is new and can contain bugs. Always verify
            transaction details before signing!
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={disclaimerCheckbox}
                  onChange={(e) => setDisclaimerCheckbox(e.target.checked)}
                  sx={{
                    color: theme.palette.warning.main,
                    "&.Mui-checked": { color: theme.palette.warning.main },
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
            sx={{ minWidth: 120 }}
          >
            Agree & Continue
          </Button>
          <Button
            onClick={() => setShowDisclaimerDialog(false)}
            variant="outlined"
            sx={{ minWidth: 120 }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MintWidget;
