import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Autocomplete,
} from "@mui/material";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { formatFullNumber } from "@lib/utils/general";
import {
  ERG_TOKEN_ID,
  ERG_DEPOSIT_RESERVE_HUMAN,
  classifyRangeSide,
  computeMaxDepositHuman,
  feeBpsToPercent,
  formatProtocolFeeBps,
  formatWalletBalanceHuman,
  humanPriceToRaw,
  humanToRaw,
  isClNotDeployedError,
  isValidFeeBps,
  normalizeClTokenIdInput,
  rawPriceToHuman,
  rawToHuman,
  shortId,
} from "./clMath";
import {
  apiJson,
  resolveToken,
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

interface CreatePositionCardProps {
  userAddresses: string[];
  /** Nautilus connection state, from `useWallet().dAppWallet.connected`. */
  walletConnected: boolean;
  onPairChange: (pair: ClPair | null) => void;
  onCreated: () => void;
  /** Bumped by the page after a successful create or dev-mint, so wallet
   * balances (and the token pickers built from them) can be refreshed. */
  refreshTrigger?: number;
}

interface PreviewResponse {
  price_current: number;
  liquidity: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  reference_prices?: {
    spectrum?: number;
    cl_positions?: number;
  };
  /** Effective protocol-fee rate for the request's fee_bps, in bps of the
   * net input. Absent when the config box couldn't be found. */
  protocol_fee_bps?: number;
  error?: string;
}

interface CreateResponse {
  unsigned_tx: any;
  position_id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  error?: string;
}

const FEE_PRESETS_BPS = [1, 5, 30, 100];
const CUSTOM_FEE_VALUE = -1;
const TOKEN_RESOLVE_DEBOUNCE_MS = 400;
const PREVIEW_DEBOUNCE_MS = 400;

const CreatePositionCard: FC<CreatePositionCardProps> = ({
  userAddresses,
  walletConnected,
  onPairChange,
  onCreated,
  refreshTrigger,
}) => {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();

  const [tokenXInput, setTokenXInput] = useState("ERG");
  const [tokenYInput, setTokenYInput] = useState("");
  const [tokenX, setTokenX] = useState<ResolvedToken | null>(null);
  const [tokenY, setTokenY] = useState<ResolvedToken | null>(null);
  const [tokenXResolving, setTokenXResolving] = useState(false);
  const [tokenYResolving, setTokenYResolving] = useState(false);

  // Wallet assets, for the Token X / Y dropdowns and the deposit balance +
  // Max button.
  const { walletBalances, walletTokenMeta, optionLabelFor, filterWalletOptions } =
    useWalletTokens(walletConnected, refreshTrigger);

  // Wallet token ids available for each dropdown. ERG is always offered for
  // Token X; Token Y never offers ERG, matching the typed-input convention
  // below.
  const walletTokenIdsX = useMemo(
    () => walletTokenIdsForSide(walletBalances, walletTokenMeta, "x"),
    [walletBalances, walletTokenMeta],
  );
  const walletTokenIdsY = useMemo(
    () => walletTokenIdsForSide(walletBalances, walletTokenMeta, "y"),
    [walletBalances, walletTokenMeta],
  );

  const [feeBpsPreset, setFeeBpsPreset] = useState<number>(30);
  const [feeBpsCustom, setFeeBpsCustom] = useState("30");

  const [minPriceHuman, setMinPriceHuman] = useState("");
  const [maxPriceHuman, setMaxPriceHuman] = useState("");
  const [currentPriceHuman, setCurrentPriceHuman] = useState("");

  const [depositSide, setDepositSide] = useState<"x" | "y">("x");
  const [depositAmountHuman, setDepositAmountHuman] = useState("");

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [notDeployedMessage, setNotDeployedMessage] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  const effectiveFeeBps =
    feeBpsPreset === CUSTOM_FEE_VALUE
      ? parseInt(feeBpsCustom, 10)
      : feeBpsPreset;

  // Resolve token X (debounced).
  useEffect(() => {
    let cancelled = false;
    setTokenXResolving(true);
    const t = setTimeout(async () => {
      const resolved = await resolveToken(tokenXInput, true);
      if (!cancelled) {
        setTokenX(resolved);
        setTokenXResolving(false);
      }
    }, TOKEN_RESOLVE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tokenXInput]);

  // Resolve token Y (debounced). Y is never ERG by convention.
  useEffect(() => {
    let cancelled = false;
    setTokenYResolving(true);
    const t = setTimeout(async () => {
      const resolved = await resolveToken(tokenYInput, false);
      if (!cancelled) {
        setTokenY(resolved);
        setTokenYResolving(false);
      }
    }, TOKEN_RESOLVE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tokenYInput]);

  // Report the (normalized) pair up to the page once both sides look valid,
  // so the positions table can filter to it. Doesn't wait for name
  // resolution -- just needs well-formed ids. Debounced so the positions
  // table doesn't refetch on every keystroke while typing a token id.
  useEffect(() => {
    const x = normalizeClTokenIdInput(tokenXInput);
    const yRaw = tokenYInput.trim();
    const t = setTimeout(() => {
      onPairChange(yRaw ? { tokenX: x, tokenY: yRaw } : null);
    }, TOKEN_RESOLVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenXInput, tokenYInput]);

  const decX = tokenX?.decimals;
  const decY = tokenY?.decimals;

  // Wallet balance for whichever token the deposit amount field is
  // currently denominated in, for the "Balance: ..." helper text + Max button.
  const depositToken = depositSide === "x" ? tokenX : tokenY;
  const depositTokenBalanceRaw = depositToken
    ? walletBalances.get(depositToken.tokenId)
    : undefined;
  const depositTokenBalanceHuman =
    depositToken && depositTokenBalanceRaw !== undefined
      ? rawToHuman(depositTokenBalanceRaw, depositToken.decimals)
      : undefined;
  const depositTokenIsErg = depositToken?.tokenId === ERG_TOKEN_ID;
  const maxDepositHuman =
    depositTokenBalanceHuman !== undefined
      ? computeMaxDepositHuman(depositTokenBalanceHuman, depositTokenIsErg)
      : undefined;

  const handleMaxDeposit = () => {
    if (maxDepositHuman === undefined) return;
    setDepositAmountHuman(String(maxDepositHuman));
  };

  const minPriceNum = parseFloat(minPriceHuman);
  const maxPriceNum = parseFloat(maxPriceHuman);
  const currentPriceNum = parseFloat(currentPriceHuman);
  const depositAmountNum = parseFloat(depositAmountHuman);

  const inputsReadyForPreview =
    !!tokenX &&
    !!tokenY &&
    decX !== undefined &&
    decY !== undefined &&
    !isNaN(minPriceNum) &&
    minPriceNum > 0 &&
    !isNaN(maxPriceNum) &&
    maxPriceNum > minPriceNum &&
    !isNaN(depositAmountNum) &&
    depositAmountNum > 0;

  const buildPreviewBody = useCallback((): Record<string, unknown> | null => {
    if (!inputsReadyForPreview || decX === undefined || decY === undefined) {
      return null;
    }
    const body: Record<string, unknown> = {
      token_x: tokenX!.tokenId,
      token_y: tokenY!.tokenId,
      price_lower: humanPriceToRaw(minPriceNum, decX, decY),
      price_upper: humanPriceToRaw(maxPriceNum, decX, decY),
    };
    if (currentPriceHuman.trim() !== "" && !isNaN(currentPriceNum)) {
      body.price_current = humanPriceToRaw(currentPriceNum, decX, decY);
    }
    if (depositSide === "x") {
      body.amount_x = humanToRaw(depositAmountNum, decX);
    } else {
      body.amount_y = humanToRaw(depositAmountNum, decY);
    }
    if (isValidFeeBps(effectiveFeeBps)) {
      body.fee_bps = effectiveFeeBps;
    }
    return body;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inputsReadyForPreview,
    tokenX,
    tokenY,
    decX,
    decY,
    minPriceNum,
    maxPriceNum,
    currentPriceHuman,
    currentPriceNum,
    depositSide,
    depositAmountNum,
    effectiveFeeBps,
  ]);

  // Debounced live preview.
  useEffect(() => {
    const body = buildPreviewBody();
    if (!body) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const result = await apiJson<PreviewResponse>("/dex/cl/preview", body);
        if (!cancelled) {
          setPreview(result);
          setPreviewError(null);
          setNotDeployedMessage(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setPreview(null);
          if (isClNotDeployedError(error)) {
            setNotDeployedMessage(error.message);
            setPreviewError(null);
          } else {
            setNotDeployedMessage(null);
            setPreviewError(error.message || "Preview failed");
          }
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [buildPreviewBody]);

  const isNoMarketError =
    !!previewError && previewError.toLowerCase().includes("starting price");

  const handleUseReferencePrice = (rawPrice: number) => {
    if (decX === undefined || decY === undefined) return;
    setCurrentPriceHuman(
      rawPriceToHuman(rawPrice, decX, decY).toString(),
    );
  };

  const handleCreate = async () => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }
    if (userAddresses.length === 0) {
      addAlert("error", "No wallet addresses found");
      return;
    }
    const body = buildPreviewBody();
    if (!body) {
      addAlert("error", "Fill in the pair, range, and deposit amount first");
      return;
    }
    if (!isValidFeeBps(effectiveFeeBps)) {
      addAlert("error", "Fee tier must be an integer between 0 and 9999 bps");
      return;
    }

    setCreating(true);
    try {
      const result = await apiJson<CreateResponse>("/dex/cl/create", {
        ...body,
        user_addresses: userAddresses,
        fee_bps: effectiveFeeBps,
        miner_fee: minerFee,
      });

      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();
      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await submitSignedTx(context, signedTx);

      addAlert(
        "success",
        `Position created! TX: ${txId.slice(0, 8)}... Position id: ${shortId(result.position_id)}`,
      );
      onCreated();
    } catch (error: any) {
      console.error("Create CL position error:", error);
      addAlert("error", error.message || "Failed to create position");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create Position
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            freeSolo
            fullWidth
            size="small"
            options={walletTokenIdsX}
            value={tokenXInput}
            onChange={(_, newValue) => setTokenXInput(newValue ?? "")}
            inputValue={tokenXInput}
            onInputChange={(_, newValue) => setTokenXInput(newValue)}
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
                      : tokenXInput.trim()
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
            value={tokenYInput}
            onChange={(_, newValue) => setTokenYInput(newValue ?? "")}
            inputValue={tokenYInput}
            onInputChange={(_, newValue) => setTokenYInput(newValue)}
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
                      : tokenYInput.trim()
                        ? "Unknown token id"
                        : "Required"
                }
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="cl-fee-tier-label">Fee tier</InputLabel>
            <Select
              labelId="cl-fee-tier-label"
              label="Fee tier"
              value={feeBpsPreset}
              onChange={(e) => setFeeBpsPreset(Number(e.target.value))}
            >
              {FEE_PRESETS_BPS.map((bps) => (
                <MenuItem key={bps} value={bps}>
                  {bps} bps ({feeBpsToPercent(bps)}%)
                </MenuItem>
              ))}
              <MenuItem value={CUSTOM_FEE_VALUE}>Custom</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Stable pairs: 1&ndash;5 bps. Volatile pairs: 30&ndash;100 bps.
          </Typography>
        </Grid>
        {feeBpsPreset === CUSTOM_FEE_VALUE && (
          <Grid item xs={12} sm={2}>
            <TextField
              label="Custom bps"
              type="number"
              size="small"
              fullWidth
              value={feeBpsCustom}
              onChange={(e) => setFeeBpsCustom(e.target.value)}
              inputProps={{ min: 0, max: 9999, step: 1 }}
              error={feeBpsCustom.trim() !== "" && !isValidFeeBps(effectiveFeeBps)}
              helperText={
                feeBpsCustom.trim() !== "" && !isValidFeeBps(effectiveFeeBps)
                  ? "0–9999, integer"
                  : "0 = no fee"
              }
            />
          </Grid>
        )}

        <Grid item xs={12} sm={feeBpsPreset === CUSTOM_FEE_VALUE ? 3 : 4}>
          <TextField
            label="Min price (human)"
            type="number"
            fullWidth
            size="small"
            value={minPriceHuman}
            onChange={(e) => setMinPriceHuman(e.target.value)}
            helperText={tokenX && tokenY ? `${tokenY.name} per ${tokenX.name}` : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={feeBpsPreset === CUSTOM_FEE_VALUE ? 3 : 4}>
          <TextField
            label="Max price (human)"
            type="number"
            fullWidth
            size="small"
            value={maxPriceHuman}
            onChange={(e) => setMaxPriceHuman(e.target.value)}
            helperText={tokenX && tokenY ? `${tokenY.name} per ${tokenX.name}` : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={12}>
          <TextField
            label="Current price (human, optional)"
            type="number"
            fullWidth
            size="small"
            value={currentPriceHuman}
            onChange={(e) => setCurrentPriceHuman(e.target.value)}
            helperText="Leave blank to use the Spectrum / existing-position reference price"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={depositSide}
            onChange={(_, v) => v && setDepositSide(v)}
          >
            <ToggleButton value="x">Deposit {tokenX?.name || "X"}</ToggleButton>
            <ToggleButton value="y">Deposit {tokenY?.name || "Y"}</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid item xs={12} sm={8}>
          <TextField
            label={`Amount (${depositSide === "x" ? tokenX?.name || "X" : tokenY?.name || "Y"}, human)`}
            type="number"
            fullWidth
            size="small"
            value={depositAmountHuman}
            onChange={(e) => setDepositAmountHuman(e.target.value)}
          />
          {walletConnected && depositToken && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {depositTokenBalanceHuman !== undefined
                  ? `Balance: ${formatWalletBalanceHuman(depositTokenBalanceHuman)} ${depositToken.name}${
                      depositTokenIsErg
                        ? ` (Max leaves ~${ERG_DEPOSIT_RESERVE_HUMAN} ERG for the miner fee and box minimums)`
                        : ""
                    }`
                  : "Balance: unknown"}
              </Typography>
              <Button
                size="small"
                onClick={handleMaxDeposit}
                disabled={maxDepositHuman === undefined}
              >
                Max
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>

      {previewLoading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            Computing preview...
          </Typography>
        </Box>
      )}

      {notDeployedMessage && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {notDeployedMessage}
        </Alert>
      )}

      {previewError && (
        <Alert severity={isNoMarketError ? "info" : "error"} sx={{ mt: 2 }}>
          {isNoMarketError
            ? "This pair has no market yet — no Spectrum pool and no existing CL positions to infer a price from. As the first liquidity provider, set the current price yourself above."
            : previewError}
        </Alert>
      )}

      {preview && !previewError && decX !== undefined && decY !== undefined && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: "10px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {(() => {
            const priceLowerRaw = humanPriceToRaw(minPriceNum, decX, decY);
            const priceUpperRaw = humanPriceToRaw(maxPriceNum, decX, decY);
            const side = classifyRangeSide(
              preview.price_current,
              priceLowerRaw,
              priceUpperRaw,
            );
            return (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Resulting deposit
                  </Typography>
                  {side.singleSided && (
                    <Chip
                      label={`Single-sided (${side.holdsOnly === "x" ? tokenX!.name : tokenY!.name} only)`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Takers pay {effectiveFeeBps} bps LP fee
                  {preview.protocol_fee_bps !== undefined
                    ? ` + ${formatProtocolFeeBps(preview.protocol_fee_bps)} protocol fee`
                    : ""}{" "}
                  on the input.
                </Typography>
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      X: {formatFullNumber(rawToHuman(preview.x, decX), 6)} {tokenX!.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      raw {preview.x.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Y: {formatFullNumber(rawToHuman(preview.y, decY), 6)} {tokenY!.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      raw {preview.y.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      vx: {formatFullNumber(rawToHuman(preview.vx, decX), 6)} {tokenX!.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      raw {preview.vx.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      vy: {formatFullNumber(rawToHuman(preview.vy, decY), 6)} {tokenY!.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      raw {preview.vy.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      Liquidity (raw): {preview.liquidity.toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
                {side.singleSided && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {side.holdsOnly === "x"
                      ? `Current price is below the range: the position holds only ${tokenX!.name} until the price rises into range.`
                      : `Current price is above the range: the position holds only ${tokenY!.name} until the price falls into range.`}
                  </Typography>
                )}
              </>
            );
          })()}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Reference prices
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {preview.reference_prices?.spectrum !== undefined && (
              <Chip
                label={`Spectrum: ${formatFullNumber(
                  rawPriceToHuman(preview.reference_prices.spectrum, decX, decY),
                  6,
                )}`}
                size="small"
                onClick={() => handleUseReferencePrice(preview.reference_prices!.spectrum!)}
                clickable
              />
            )}
            {preview.reference_prices?.cl_positions !== undefined && (
              <Chip
                label={`Existing CL positions: ${formatFullNumber(
                  rawPriceToHuman(preview.reference_prices.cl_positions, decX, decY),
                  6,
                )}`}
                size="small"
                onClick={() => handleUseReferencePrice(preview.reference_prices!.cl_positions!)}
                clickable
              />
            )}
            {!preview.reference_prices?.spectrum && !preview.reference_prices?.cl_positions && (
              <Typography variant="caption" color="text.secondary">
                No reference price available for this pair.
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Click a reference to use it as the current price.
          </Typography>
        </Box>
      )}

      {!walletConnected && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Connect a Nautilus wallet to create a position.
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleCreate}
          disabled={
            creating ||
            !preview ||
            !!previewError ||
            !walletConnected ||
            !isValidFeeBps(effectiveFeeBps)
          }
          startIcon={creating ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {creating
            ? "Creating..."
            : !walletConnected
              ? "Connect wallet to create"
              : "Create Position"}
        </Button>
      </Box>
    </Paper>
  );
};

export default CreatePositionCard;
