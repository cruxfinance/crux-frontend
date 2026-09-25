import React, { FC, useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { formatFullNumber } from "@lib/utils/general";
import { CRUX_TOKEN_ID } from "@lib/configs/paymentTokens";
import {
  ERG_TOKEN_ID,
  computeMaxDepositHuman,
  formatWalletBalanceHuman,
  limitOrderPriceRatio,
  rawToHuman,
  shortId,
} from "./clMath";
import {
  apiJson,
  resolveToken,
  resolveTokenById,
  submitSignedTx,
  useWalletTokens,
  walletTokenIdsForSide,
} from "./walletTokens";
import type { ResolvedToken } from "./walletTokens";
import type { ClPair } from "./PositionsTable";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface LimitOrderCardProps {
  /** The page's current CL pair (from `CreatePositionCard`). Used as the
   * order pair unless "Override tokens" is on. */
  pair: ClPair | null;
  walletConnected: boolean;
  /** Bumped by the page after a successful create or dev-mint, so wallet
   * balances (and the token pickers built from them) can be refreshed. */
  refreshTrigger?: number;
  onCreated: () => void;
}

interface LimitOrderResponse {
  unsigned_tx: any;
  order_id: string;
}

const TOKEN_RESOLVE_DEBOUNCE_MS = 400;

/** Mirrors `LimitOrderWidget`'s expiry choices. */
const EXPIRY_PRESETS: { label: string; blocks: number | null }[] = [
  { label: "1h", blocks: 30 },
  { label: "6h", blocks: 180 },
  { label: "24h", blocks: 720 },
  { label: "7d", blocks: 5040 },
  { label: "14d", blocks: 10080 },
  { label: "No Expiry", blocks: null },
];

const LimitOrderCard: FC<LimitOrderCardProps> = ({
  pair,
  walletConnected,
  refreshTrigger,
  onCreated,
}) => {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();

  const [overrideTokens, setOverrideTokens] = useState(false);
  const [tokenXOverrideInput, setTokenXOverrideInput] = useState("ERG");
  const [tokenYOverrideInput, setTokenYOverrideInput] = useState("");
  const [tokenX, setTokenX] = useState<ResolvedToken | null>(null);
  const [tokenY, setTokenY] = useState<ResolvedToken | null>(null);
  const [tokenXResolving, setTokenXResolving] = useState(false);
  const [tokenYResolving, setTokenYResolving] = useState(false);

  const { walletBalances, walletTokenMeta, optionLabelFor, filterWalletOptions } =
    useWalletTokens(walletConnected, refreshTrigger);
  const walletTokenIdsX = useMemo(
    () => walletTokenIdsForSide(walletBalances, walletTokenMeta, "x"),
    [walletBalances, walletTokenMeta],
  );
  const walletTokenIdsY = useMemo(
    () => walletTokenIdsForSide(walletBalances, walletTokenMeta, "y"),
    [walletBalances, walletTokenMeta],
  );

  // Override mode: resolve the free-typed Token X / Y inputs (debounced),
  // same as CreatePositionCard.
  useEffect(() => {
    if (!overrideTokens) return;
    let cancelled = false;
    setTokenXResolving(true);
    const t = setTimeout(async () => {
      const resolved = await resolveToken(tokenXOverrideInput, true);
      if (!cancelled) {
        setTokenX(resolved);
        setTokenXResolving(false);
      }
    }, TOKEN_RESOLVE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [overrideTokens, tokenXOverrideInput]);

  useEffect(() => {
    if (!overrideTokens) return;
    let cancelled = false;
    setTokenYResolving(true);
    const t = setTimeout(async () => {
      const resolved = await resolveToken(tokenYOverrideInput, false);
      if (!cancelled) {
        setTokenY(resolved);
        setTokenYResolving(false);
      }
    }, TOKEN_RESOLVE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [overrideTokens, tokenYOverrideInput]);

  // Default mode: resolve the page's CL pair.
  useEffect(() => {
    if (overrideTokens) return;
    if (!pair) {
      setTokenX(null);
      return;
    }
    let cancelled = false;
    setTokenXResolving(true);
    resolveTokenById(pair.tokenX).then((resolved) => {
      if (!cancelled) {
        setTokenX(resolved);
        setTokenXResolving(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // Depend on the id, not `pair` itself -- the page hands us a new object
    // on every debounce tick even when the pair hasn't actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideTokens, pair?.tokenX]);

  useEffect(() => {
    if (overrideTokens) return;
    if (!pair) {
      setTokenY(null);
      return;
    }
    let cancelled = false;
    setTokenYResolving(true);
    resolveTokenById(pair.tokenY).then((resolved) => {
      if (!cancelled) {
        setTokenY(resolved);
        setTokenYResolving(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideTokens, pair?.tokenY]);

  const [side, setSide] = useState<"sellX" | "buyX">("sellX");
  const [priceHuman, setPriceHuman] = useState("");
  const [amountHuman, setAmountHuman] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<number | null>(720);
  const [feeToken, setFeeToken] = useState<"erg" | "crux">("erg");
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  // Current block height, for expiry -- same approach as LimitOrderWidget.
  useEffect(() => {
    const fetchHeight = async () => {
      try {
        const response = await fetch(`${process.env.CRUX_API}/crux/info`);
        if (response.ok) {
          const data = await response.json();
          if (data.indexed_height) setCurrentHeight(data.indexed_height);
        }
      } catch (error) {
        console.error("Error fetching block height:", error);
      }
    };
    fetchHeight();
    const interval = setInterval(fetchHeight, 60000);
    return () => clearInterval(interval);
  }, []);

  const formDisabled = !overrideTokens && !pair;
  const tokensReady = !!tokenX && !!tokenY;
  const tokensDistinct = tokensReady && tokenX!.tokenId !== tokenY!.tokenId;

  const givenToken = side === "sellX" ? tokenX : tokenY;
  const takenToken = side === "sellX" ? tokenY : tokenX;

  const givenBalanceRaw = givenToken ? walletBalances.get(givenToken.tokenId) : undefined;
  const givenBalanceHuman =
    givenToken && givenBalanceRaw !== undefined
      ? rawToHuman(givenBalanceRaw, givenToken.decimals)
      : undefined;
  const givenIsErg = givenToken?.tokenId === ERG_TOKEN_ID;
  const maxAmountHuman =
    givenBalanceHuman !== undefined
      ? computeMaxDepositHuman(givenBalanceHuman, givenIsErg)
      : undefined;
  const handleMaxAmount = () => {
    if (maxAmountHuman !== undefined) setAmountHuman(String(maxAmountHuman));
  };

  const priceNum = parseFloat(priceHuman);
  const amountNum = parseFloat(amountHuman);
  const inputsValid =
    tokensDistinct && !isNaN(priceNum) && priceNum > 0 && !isNaN(amountNum) && amountNum > 0;

  // Minimum taken amount + the raw price ratio, shared by the "you receive"
  // preview line and the submit body.
  const orderPreview = inputsValid
    ? (() => {
        const givenRaw = Math.floor(amountNum * Math.pow(10, givenToken!.decimals));
        const { numerator, denominator } = limitOrderPriceRatio(
          side,
          priceNum,
          tokenX!.decimals,
          tokenY!.decimals,
        );
        const takenRawMin = Math.ceil((givenRaw * numerator) / denominator);
        // The ceil on the numerator can move the price a lot when the taken
        // token has few decimals; show what the ratio actually encodes.
        const rawRatio = numerator / denominator;
        const effectivePriceYPerX =
          side === "sellX"
            ? rawRatio * Math.pow(10, tokenX!.decimals - tokenY!.decimals)
            : 1 / (rawRatio * Math.pow(10, tokenY!.decimals - tokenX!.decimals));
        return {
          givenRaw,
          numerator,
          denominator,
          effectivePriceYPerX,
          takenHumanMin: rawToHuman(takenRawMin, takenToken!.decimals),
        };
      })()
    : null;

  const handleSubmit = async () => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }
    if (!orderPreview || !tokenX || !tokenY || !givenToken || !takenToken) {
      addAlert("error", "Fill in the tokens, price, and amount first");
      return;
    }

    setSubmitting(true);
    try {
      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();
      const changeAddress = await context.get_change_address();
      const usedAddresses = await context.get_used_addresses();
      const unusedAddresses = await context.get_unused_addresses();
      const userAddresses = [
        ...new Set([changeAddress, ...usedAddresses, ...unusedAddresses]),
      ].join(",");

      const body = {
        user_addresses: userAddresses,
        given_token_id: givenToken.tokenId,
        given_token_amount: orderPreview.givenRaw,
        taken_token_id: takenToken.tokenId,
        price_numerator: orderPreview.numerator,
        price_denominator: orderPreview.denominator,
        min_fill_amount: 0,
        expiry_height:
          expiryPreset !== null && currentHeight ? currentHeight + expiryPreset : null,
        miner_fee: minerFee,
        fee_token_id: feeToken === "crux" ? CRUX_TOKEN_ID : null,
      };

      const result = await apiJson<LimitOrderResponse>("/dex/limit_order", body);

      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await submitSignedTx(context, signedTx);

      addAlert("success", `Limit order created! TX: ${txId.slice(0, 8)}...`);
      setLastOrderId(result.order_id);
      setLastTxId(txId);
      onCreated();
    } catch (error: any) {
      console.error("Create limit order error:", error);
      addAlert("error", error.message || "Failed to create limit order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create Limit Order
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={overrideTokens}
            onChange={(e) => setOverrideTokens(e.target.checked)}
          />
        }
        label="Override tokens"
        sx={{ mb: 1 }}
      />

      {formDisabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select a pair in Create Position, or override tokens.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {overrideTokens ? (
          <>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                fullWidth
                size="small"
                options={walletTokenIdsX}
                value={tokenXOverrideInput}
                onChange={(_, newValue) => setTokenXOverrideInput(newValue ?? "")}
                inputValue={tokenXOverrideInput}
                onInputChange={(_, newValue) => setTokenXOverrideInput(newValue)}
                getOptionLabel={(option) => (option === ERG_TOKEN_ID ? "ERG" : option)}
                filterOptions={filterWalletOptions}
                renderOption={(props, option) => <li {...props}>{optionLabelFor(option)}</li>}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Token X"
                    placeholder="ERG (or a token id)"
                    helperText={
                      tokenXResolving
                        ? "Resolving..."
                        : tokenX
                          ? `${tokenX.name} (${tokenX.decimals} decimals)${
                              tokenX.tokenId === ERG_TOKEN_ID ? "" : ` — ${shortId(tokenX.tokenId)}`
                            }`
                          : tokenXOverrideInput.trim()
                            ? "Unknown token id"
                            : "Leave empty or type ERG for the ERG side"
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                fullWidth
                size="small"
                options={walletTokenIdsY}
                value={tokenYOverrideInput}
                onChange={(_, newValue) => setTokenYOverrideInput(newValue ?? "")}
                inputValue={tokenYOverrideInput}
                onInputChange={(_, newValue) => setTokenYOverrideInput(newValue)}
                getOptionLabel={(option) => option}
                filterOptions={filterWalletOptions}
                renderOption={(props, option) => <li {...props}>{optionLabelFor(option)}</li>}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Token Y"
                    placeholder="Token id"
                    helperText={
                      tokenYResolving
                        ? "Resolving..."
                        : tokenY
                          ? `${tokenY.name} (${tokenY.decimals} decimals) — ${shortId(tokenY.tokenId)}`
                          : tokenYOverrideInput.trim()
                            ? "Unknown token id"
                            : "Required"
                    }
                  />
                )}
              />
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Token X"
                fullWidth
                size="small"
                disabled
                value={
                  tokenX
                    ? `${tokenX.name} — ${shortId(tokenX.tokenId)}`
                    : pair
                      ? shortId(pair.tokenX)
                      : ""
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Token Y"
                fullWidth
                size="small"
                disabled
                value={
                  tokenY
                    ? `${tokenY.name} — ${shortId(tokenY.tokenId)}`
                    : pair
                      ? shortId(pair.tokenY)
                      : ""
                }
              />
            </Grid>
          </>
        )}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={side}
            onChange={(_, v) => v && setSide(v)}
            disabled={formDisabled}
          >
            <ToggleButton value="sellX">
              Sell {tokenX?.name || "X"} → {tokenY?.name || "Y"}
            </ToggleButton>
            <ToggleButton value="buyX">
              Buy {tokenX?.name || "X"} with {tokenY?.name || "Y"}
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Price (Y per X)"
            type="number"
            fullWidth
            size="small"
            disabled={formDisabled}
            value={priceHuman}
            onChange={(e) => setPriceHuman(e.target.value)}
            helperText={
              tokenX && tokenY
                ? `${tokenY.name} per ${tokenX.name} — same convention as the CL page`
                : "Same convention as the CL page: price is Y per X"
            }
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label={`Amount (${givenToken?.name || "given token"}, human)`}
            type="number"
            fullWidth
            size="small"
            disabled={formDisabled}
            value={amountHuman}
            onChange={(e) => setAmountHuman(e.target.value)}
          />
          {walletConnected && givenToken && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {givenBalanceHuman !== undefined
                  ? `Balance: ${formatWalletBalanceHuman(givenBalanceHuman)} ${givenToken.name}`
                  : "Balance: unknown"}
              </Typography>
              <Button size="small" onClick={handleMaxAmount} disabled={maxAmountHuman === undefined}>
                Max
              </Button>
            </Box>
          )}
        </Grid>

        {orderPreview && takenToken && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              You receive at least ≈ {formatFullNumber(orderPreview.takenHumanMin, 6)}{" "}
              {takenToken.name}
            </Typography>
          </Grid>
        )}

        <Grid item xs={12}>
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
                disabled={formDisabled}
              />
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            Fee token
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={feeToken}
            onChange={(_, v) => v && setFeeToken(v)}
            disabled={formDisabled}
          >
            <ToggleButton value="erg">ERG</ToggleButton>
            <ToggleButton value="crux">CRUX</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>

      {!walletConnected && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Connect a Nautilus wallet to create a limit order.
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        onClick={handleSubmit}
        disabled={submitting || formDisabled || !walletConnected || !orderPreview}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {submitting
          ? "Creating..."
          : !walletConnected
            ? "Connect wallet to create"
            : "Create Limit Order"}
      </Button>

      {lastOrderId && lastTxId && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", userSelect: "text" }}>
            Order id: {lastOrderId}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", userSelect: "text" }}>
            TX: {lastTxId}
          </Typography>
        </Box>
      )}

      {orderPreview && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          raw given {orderPreview.givenRaw.toLocaleString()}, numerator{" "}
          {orderPreview.numerator.toLocaleString()}, denominator{" "}
          {orderPreview.denominator.toLocaleString()}, effective price{" "}
          {formatFullNumber(orderPreview.effectivePriceYPerX, 9)} Y per X
        </Typography>
      )}
    </Paper>
  );
};

export default LimitOrderCard;
