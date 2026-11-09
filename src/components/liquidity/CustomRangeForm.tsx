import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link as MuiLink,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { formatFullNumber } from "@lib/utils/general";
import RangeChart from "@components/cl/RangeChart";
import {
  ERG_TOKEN_ID,
  ERG_DEPOSIT_RESERVE_HUMAN,
  classifyRangeSide,
  computeMaxDepositHuman,
  exceedsWalletBalance,
  feePpmToPercent,
  formatAmountTrimmed,
  formatProtocolFeeBps,
  formatProtocolFeeFormula,
  formatWalletBalanceHuman,
  humanToRaw,
  isClNotDeployedError,
  isValidFeePpm,
  percentToFeePpm,
  rawPriceToHuman,
  rawToHuman,
  reserveToWalletRaw,
  trimDecimalZeros,
  walletToReserveRaw,
  CL_KEY_BOX_NANOERG,
  CL_POSITION_FLOOR_NANOERG,
  CL_TOKEN_DUST_RAW,
} from "@components/cl/clMath";
import {
  RANGE_PRESETS_PCT,
  bucketLiquidity,
  buildClRequestBody,
  computeDomain,
  formatPriceCompact,
  invertRange,
  positionDisplayRange,
  presetRange,
  valueSplitPct,
} from "@components/cl/clLiquidity";
import type { LiquidityRange, MergedPair, PriceRange } from "@components/cl/clLiquidity";
import { fetchPairPositions } from "@components/cl/useClData";
import { useClStatus } from "@components/cl/useClStatus";
import type { ClProtocolConfig } from "@components/cl/useClData";
import { ClPreviewResponse, useClCreate } from "@components/cl/useClCreate";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { apiJson, fetchWalletBalances } from "@components/cl/walletTokens";
import type { ClPositionDto } from "@components/cl/clTypes";

/** LP fee tier presets, in parts per million (3000 = 0.3%). */
const FEE_PRESETS_PPM = [250, 500, 3000, 5000, 10000];
const CUSTOM_FEE = -1;
const PREVIEW_DEBOUNCE_MS = 400;
const HISTOGRAM_BUCKETS = 48;

const cardSx = {
  borderRadius: "12px",
  bgcolor: "rgba(255,255,255,0.03)",
  border: "1px solid",
  borderColor: "divider",
  p: 2,
} as const;

interface CustomRangeFormProps {
  pair: MergedPair;
  userAddresses: string[];
  walletConnected: boolean;
  ergPrice: number;
  icons: Record<string, string>;
  protocolConfig: ClProtocolConfig | null;
  onClose: () => void;
  /** Called after a position was created and submitted. */
  onCreated: () => void;
}

/** Amount text for an input: trims float noise, keeps up to `decimals` places. */
function amountText(human: number, decimals: number): string {
  if (!Number.isFinite(human) || human <= 0) return "";
  return trimDecimalZeros(human.toFixed(Math.min(decimals, 9)));
}

const CustomRangeForm: FC<CustomRangeFormProps> = ({
  pair,
  userAddresses,
  walletConnected,
  ergPrice,
  icons,
  protocolConfig,
  onClose,
  onCreated,
}) => {
  const theme = useTheme();
  const { create, creating } = useClCreate(userAddresses);
  const clStatus = useClStatus();
  const clPaused = !!clStatus?.paused;
  const { minerFee } = useMinerFee();

  const { tokenX, tokenY, nameX, nameY, decimalsX: decX, decimalsY: decY } = pair;

  // Reference price (Y per X, human): Spectrum mid, else the CL price.
  const referencePrice = useMemo(() => {
    const pool = pair.pool;
    if (pool && pool.base_amount > 0 && pool.quote_amount > 0) {
      const base = pool.base_amount / Math.pow(10, pool.base_token_decimals);
      const quote = pool.quote_amount / Math.pow(10, pool.quote_token_decimals);
      return pool.base_token_id === tokenX ? quote / base : base / quote;
    }
    if (pair.cl?.price_current && pair.cl.price_current > 0) return pair.cl.price_current;
    return null;
  }, [pair, tokenX]);

  const [manualPrice, setManualPrice] = useState("");
  const manualNum = parseFloat(manualPrice);
  const currentPrice =
    referencePrice ?? (manualNum > 0 ? manualNum : null);

  const [inverted, setInverted] = useState(false);
  const [selection, setSelection] = useState<PriceRange | null>(null); // canonical, Y per X
  const [presetPct, setPresetPct] = useState<number | null>(10);
  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  const [feePpmPreset, setFeePpmPreset] = useState(3000);
  const [feePercentCustom, setFeePercentCustom] = useState("0.3");
  const feePpm = feePpmPreset === CUSTOM_FEE ? percentToFeePpm(feePercentCustom) : feePpmPreset;

  const [amtX, setAmtX] = useState("");
  const [amtY, setAmtY] = useState("");
  const [edited, setEdited] = useState<"x" | "y">("x");
  // Exact wallet amount (raw) of the side filled from the preview; its text is trimmed.
  const [derivedRaw, setDerivedRaw] = useState<number | null>(null);

  const [preview, setPreview] = useState<ClPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [notDeployed, setNotDeployed] = useState<string | null>(null);

  const [positions, setPositions] = useState<ClPositionDto[]>([]);
  const [positionsError, setPositionsError] = useState(false);
  const [balances, setBalances] = useState<Map<string, number> | null>(null);
  const [success, setSuccess] = useState<{ txId: string; positionId: string } | null>(null);

  // Existing positions of the pair, for the histogram.
  useEffect(() => {
    let cancelled = false;
    fetchPairPositions(tokenX, tokenY)
      .then((p) => !cancelled && setPositions(p))
      .catch(() => !cancelled && setPositionsError(true));
    return () => {
      cancelled = true;
    };
  }, [tokenX, tokenY]);

  useEffect(() => {
    if (!walletConnected) return;
    let cancelled = false;
    fetchWalletBalances().then((b) => !cancelled && setBalances(b));
    return () => {
      cancelled = true;
    };
  }, [walletConnected, success]);

  // Default range (+-10%) once a price is known; re-centre if it changes.
  const seededFor = useRef<number | null>(null);
  useEffect(() => {
    if (currentPrice && seededFor.current !== currentPrice && (presetPct !== null || !selection)) {
      seededFor.current = currentPrice;
      setSelection(presetRange(currentPrice, presetPct ?? 10));
    }
  }, [currentPrice, presetPct, selection]);

  const displayed = (p: number) => (inverted ? 1 / p : p);
  const displaySelection: PriceRange | null = selection
    ? inverted
      ? invertRange(selection)
      : selection
    : null;
  const displayCurrent = currentPrice ? displayed(currentPrice) : null;
  const unitLabel = inverted ? `${nameX} per ${nameY}` : `${nameY} per ${nameX}`;

  const setDisplayRange = useCallback(
    (r: PriceRange, fromDrag = false) => {
      setSelection(inverted ? invertRange(r) : r);
      if (fromDrag) setPresetPct(null);
    },
    [inverted],
  );

  // Chart domain: frozen while dragging so the axis does not slide.
  const [dragging, setDragging] = useState(false);
  const frozenDomain = useRef<PriceRange | null>(null);
  const displayRanges: LiquidityRange[] = useMemo(
    () =>
      positions
        .filter((p) => p.liquidity > 0)
        .map((p) => ({
          ...positionDisplayRange(p.price_lower, p.price_upper, decX, decY, inverted),
          liquidity: p.liquidity,
        })),
    [positions, decX, decY, inverted],
  );
  const liveDomain = useMemo(
    () =>
      displayCurrent
        ? computeDomain(displayCurrent, displaySelection, displayRanges)
        : null,
    [displayCurrent, displaySelection, displayRanges],
  );
  if (!dragging) frozenDomain.current = liveDomain;
  const domain = dragging && frozenDomain.current ? frozenDomain.current : liveDomain;
  const buckets = useMemo(
    () => (domain ? bucketLiquidity(displayRanges, domain.min, domain.max, HISTOGRAM_BUCKETS) : []),
    [displayRanges, domain],
  );

  // Numeric min/max inputs (display orientation).
  const commitBound = (which: "min" | "max", text: string) => {
    const v = parseFloat(text);
    if (!(v > 0) || !displaySelection) return;
    const next = which === "min" ? { min: v, max: displaySelection.max } : { min: displaySelection.min, max: v };
    if (next.max > next.min) {
      setDisplayRange(next);
      setPresetPct(null);
    }
  };

  const applyPreset = (pct: number) => {
    if (!currentPrice) return;
    setPresetPct(pct);
    seededFor.current = currentPrice;
    // +-pct in canonical price keeps the range symmetric in either orientation
    // to within rounding; do it in the displayed orientation for exactness.
    const r = presetRange(displayed(currentPrice), pct);
    setDisplayRange(r);
  };

  // Deposit-side token metadata.
  const balanceHuman = (id: string, dec: number): number | undefined => {
    const raw = balances?.get(id);
    return raw === undefined ? undefined : rawToHuman(raw, dec);
  };
  const balX = balanceHuman(tokenX, decX);
  const balY = balanceHuman(tokenY, decY);

  const isErgX = tokenX === ERG_TOKEN_ID;
  const isErgY = tokenY === ERG_TOKEN_ID;

  // Reserve (raw) the request carries for the edited side; <= 0 means no amount.
  const editedReserveRaw = (side: "x" | "y", text: string): number => {
    const wallet = humanToRaw(parseFloat(text) || 0, side === "x" ? decX : decY);
    return walletToReserveRaw(wallet, side === "x" ? isErgX : isErgY);
  };
  const editedText = edited === "x" ? amtX : amtY;
  const editedReserve = editedReserveRaw(edited, editedText);
  const editedNum = rawToHuman(editedReserve, edited === "x" ? decX : decY);

  const requestBody = useMemo(() => {
    if (!selection) return null;
    return buildClRequestBody({
      tokenX,
      tokenY,
      decimalsX: decX,
      decimalsY: decY,
      minPrice: selection.min,
      maxPrice: selection.max,
      currentPrice: referencePrice ? null : manualNum > 0 ? manualNum : null,
      side: edited,
      amount: editedNum,
      feePpm,
    });
  }, [selection, tokenX, tokenY, decX, decY, referencePrice, manualNum, edited, editedNum, feePpm]);

  // Debounced preview; fills the other side's amount.
  useEffect(() => {
    if (!requestBody) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await apiJson<ClPreviewResponse>("/dex/cl/preview", requestBody);
        if (cancelled) return;
        setPreview(r);
        setPreviewError(null);
        setNotDeployed(null);
        if (edited === "x") {
          const raw = reserveToWalletRaw(r.y, isErgY);
          setDerivedRaw(raw);
          setAmtY(formatAmountTrimmed(rawToHuman(raw, decY), decY));
        } else {
          const raw = reserveToWalletRaw(r.x, isErgX);
          setDerivedRaw(raw);
          setAmtX(formatAmountTrimmed(rawToHuman(raw, decX), decX));
        }
      } catch (e: any) {
        if (cancelled) return;
        setPreview(null);
        if (isClNotDeployedError(e)) {
          setNotDeployed(e.message);
          setPreviewError(null);
        } else {
          setNotDeployed(null);
          setPreviewError(e.message || "Preview failed");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestBody]);

  const onAmountChange = (side: "x" | "y", text: string) => {
    setEdited(side);
    setDerivedRaw(null);
    if (side === "x") setAmtX(text);
    else setAmtY(text);
    if (editedReserveRaw(side, text) <= 0) {
      if (side === "x") setAmtY("");
      else setAmtX("");
      setPreview(null);
    }
  };

  const maxFor = (side: "x" | "y") => {
    const bal = side === "x" ? balX : balY;
    if (bal === undefined) return undefined;
    const tok = side === "x" ? tokenX : tokenY;
    return computeMaxDepositHuman(bal, tok === ERG_TOKEN_ID);
  };
  const onMax = (side: "x" | "y") => {
    const m = maxFor(side);
    if (m === undefined) return;
    onAmountChange(side, amountText(m, side === "x" ? decX : decY) || "0");
  };

  // Exact wallet amounts (raw): the typed side from its text, the other from the preview.
  const walletRawFor = (s: "x" | "y"): number =>
    s === edited
      ? humanToRaw(parseFloat(s === "x" ? amtX : amtY) || 0, s === "x" ? decX : decY)
      : derivedRaw ?? humanToRaw(parseFloat(s === "x" ? amtX : amtY) || 0, s === "x" ? decX : decY);
  const amountXNum = rawToHuman(walletRawFor("x"), decX);
  const amountYNum = rawToHuman(walletRawFor("y"), decY);
  const exceeds = (s: "x" | "y"): boolean => {
    const raw = balances?.get(s === "x" ? tokenX : tokenY);
    return raw !== undefined && exceedsWalletBalance(walletRawFor(s), raw);
  };
  const insufficient = exceeds("x") || exceeds("y");

  // Which side of the range the current price is on.
  const effectiveCurrent = preview
    ? rawPriceToHuman(preview.price_current, decX, decY)
    : currentPrice;
  const side =
    selection && effectiveCurrent
      ? classifyRangeSide(effectiveCurrent, selection.min, selection.max)
      : null;
  const split =
    effectiveCurrent && preview ? valueSplitPct(amountXNum, amountYNum, effectiveCurrent) : null;
  const totalUsd =
    tokenX === ERG_TOKEN_ID && ergPrice > 0 && effectiveCurrent
      ? (amountXNum + amountYNum / effectiveCurrent) * ergPrice
      : null;

  const isNoMarket = !!previewError && previewError.toLowerCase().includes("starting price");

  const handleCreate = async () => {
    if (!requestBody) return;
    const r = await create(requestBody, feePpm);
    if (r) {
      setSuccess(r);
      onCreated();
    }
  };

  const reset = () => {
    setSuccess(null);
    setAmtX("");
    setAmtY("");
    setDerivedRaw(null);
    setPreview(null);
  };

  const tokenChip = (id: string, name: string) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "rgba(255,255,255,0.06)",
        borderRadius: "8px",
        px: 1.5,
        py: 0.75,
        flexShrink: 0,
      }}
    >
      <Avatar src={icons[id]} sx={{ width: 24, height: 24, fontSize: "0.7rem" }}>
        {name?.[0]}
      </Avatar>
      <Typography variant="body1" fontWeight={600} sx={{ mb: 0 }}>
        {name}
      </Typography>
    </Box>
  );

  const amountCard = (s: "x" | "y") => {
    const id = s === "x" ? tokenX : tokenY;
    const name = s === "x" ? nameX : nameY;
    const bal = s === "x" ? balX : balY;
    const value = s === "x" ? amtX : amtY;
    const usd =
      id === ERG_TOKEN_ID && ergPrice > 0 && parseFloat(value) > 0
        ? parseFloat(value) * ergPrice
        : null;
    const disabledSide =
      side?.singleSided && side.holdsOnly !== s ? true : false;
    return (
      <Box
        sx={{
          ...cardSx,
          borderColor: edited === s ? "rgba(144, 202, 249, 0.45)" : "divider",
          transition: "border-color 0.2s",
          "&:hover": { borderColor: "rgba(200,225,255,0.2)" },
          opacity: disabledSide ? 0.6 : 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {tokenChip(id, name)}
          <TextField
            fullWidth
            variant="standard"
            type="number"
            value={value}
            onChange={(e) => onAmountChange(s, e.target.value)}
            placeholder="0.00"
            inputProps={{ min: 0, step: "any", "aria-label": `${name} amount` }}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: "1.5rem",
                fontWeight: 500,
                "& input": { textAlign: "right", p: 0 },
                "& input::placeholder": { opacity: 0.4 },
              },
            }}
          />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5, minHeight: 24 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {walletConnected && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
                  Balance: {bal !== undefined ? formatWalletBalanceHuman(bal) : "—"}
                </Typography>
                <Button
                  size="small"
                  sx={{ minWidth: 0, py: 0, px: 0.75, fontSize: "0.7rem" }}
                  disabled={maxFor(s) === undefined}
                  onClick={() => onMax(s)}
                >
                  Max
                </Button>
              </>
            )}
          </Box>
          {usd !== null && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
              {"≈"} ${formatFullNumber(usd, 2)}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  if (success) {
    return (
      <Box sx={{ px: 3, pb: 3, pt: 1, textAlign: "center" }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 56, color: theme.palette.success.main, mb: 1 }} />
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          Position submitted
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your {nameX} / {nameY} range position will show up under Your Positions once the
          transaction confirms.
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, wordBreak: "break-all" }}>
          <MuiLink
            href={`https://explorer.ergoplatform.com/en/transactions/${success.txId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction {success.txId.slice(0, 10)}...
          </MuiLink>
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button fullWidth variant="outlined" onClick={reset} sx={{ borderRadius: "12px", py: 1.25 }}>
            Add another
          </Button>
          <Button fullWidth variant="contained" onClick={onClose} sx={{ borderRadius: "12px", py: 1.25 }}>
            Done
          </Button>
        </Box>
      </Box>
    );
  }

  const canCreate =
    !!preview && !previewError && walletConnected && isValidFeePpm(feePpm) && !insufficient && !creating;

  return (
    <>
      <Box sx={{ px: 3, pb: 0 }}>
        {/* Price + orientation */}
        <Box sx={{ ...cardSx, mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0, display: "block" }}>
                Current price
              </Typography>
              {displayCurrent ? (
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0, lineHeight: 1.3 }}>
                  {formatPriceCompact(displayCurrent)}{" "}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {unitLabel}
                  </Typography>
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                  No market yet
                </Typography>
              )}
            </Box>
            <Tooltip title="Flip price direction">
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHorizIcon />}
                onClick={() => {
                  setInverted((v) => !v);
                  setPresetPct(null);
                  setMinDraft(null);
                  setMaxDraft(null);
                }}
                sx={{ whiteSpace: "nowrap", borderRadius: "8px" }}
              >
                {inverted ? `${nameX} per ${nameY}` : `${nameY} per ${nameX}`}
              </Button>
            </Tooltip>
          </Box>
          {!referencePrice && (
            <TextField
              size="small"
              fullWidth
              type="number"
              label={`Starting price (${nameY} per ${nameX})`}
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              helperText="This pair has no Spectrum pool or CL liquidity yet. As the first provider you set the price."
              sx={{ mt: 1.5 }}
            />
          )}
        </Box>

        {/* Range chart */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Price range
        </Typography>
        <Box sx={{ ...cardSx, mb: 1.5, px: 1.5 }}>
          {domain ? (
            <RangeChart
              buckets={buckets}
              domain={domain}
              currentPrice={displayCurrent}
              selection={displaySelection}
              onSelectionChange={(r) => setDisplayRange(r, true)}
              onDragStateChange={setDragging}
              formatPrice={formatPriceCompact}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center", mb: 0 }}>
              Enter a starting price to choose a range.
            </Typography>
          )}
          {positionsError && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
              Existing liquidity could not be loaded.
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          {RANGE_PRESETS_PCT.map((pct) => (
            <Chip
              key={pct}
              label={`±${pct}%`}
              onClick={() => applyPreset(pct)}
              disabled={!currentPrice}
              color={presetPct === pct ? "primary" : "default"}
              variant={presetPct === pct ? "filled" : "outlined"}
              sx={{
                flex: 1,
                fontWeight: 600,
                borderRadius: "8px",
                height: 32,
                ...(presetPct !== pct && { borderColor: "divider" }),
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          {(["min", "max"] as const).map((which) => {
            const val = displaySelection ? displaySelection[which] : null;
            const draft = which === "min" ? minDraft : maxDraft;
            const setDraft = which === "min" ? setMinDraft : setMaxDraft;
            return (
              <TextField
                key={which}
                size="small"
                fullWidth
                type="number"
                label={which === "min" ? "Min price" : "Max price"}
                value={draft ?? (val !== null ? String(Number(val.toPrecision(6))) : "")}
                onChange={(e) => {
                  setDraft(e.target.value);
                  commitBound(which, e.target.value);
                }}
                onBlur={() => setDraft(null)}
                disabled={!displaySelection}
                inputProps={{ step: "any", min: 0 }}
                helperText={unitLabel}
              />
            );
          })}
        </Box>

        {/* Fee tier */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Fee tier
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
          {FEE_PRESETS_PPM.map((ppm) => (
            <Chip
              key={ppm}
              label={`${feePpmToPercent(ppm)}%`}
              onClick={() => setFeePpmPreset(ppm)}
              color={feePpmPreset === ppm ? "primary" : "default"}
              variant={feePpmPreset === ppm ? "filled" : "outlined"}
              sx={{ flex: 1, fontWeight: 600, borderRadius: "8px", height: 32, ...(feePpmPreset !== ppm && { borderColor: "divider" }) }}
            />
          ))}
          <Chip
            label="Custom"
            onClick={() => setFeePpmPreset(CUSTOM_FEE)}
            color={feePpmPreset === CUSTOM_FEE ? "primary" : "default"}
            variant={feePpmPreset === CUSTOM_FEE ? "filled" : "outlined"}
            sx={{ flex: 1, fontWeight: 600, borderRadius: "8px", height: 32, ...(feePpmPreset !== CUSTOM_FEE && { borderColor: "divider" }) }}
          />
        </Box>
        {feePpmPreset === CUSTOM_FEE && (
          <TextField
            size="small"
            type="number"
            label="Custom fee (%)"
            value={feePercentCustom}
            onChange={(e) => setFeePercentCustom(e.target.value)}
            inputProps={{ min: 0, max: 99.9999, step: 0.0001 }}
            error={feePercentCustom.trim() !== "" && !isValidFeePpm(feePpm)}
            helperText={!isValidFeePpm(feePpm) ? "Up to 4 decimals, below 100%" : "up to 4 decimals, 0 = no fee"}
            sx={{ mt: 1, mb: 0.5, width: 180 }}
          />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Stable pairs: 0.01&ndash;0.05%. Volatile pairs: 0.3&ndash;1%.
          {protocolConfig
            ? ` Protocol fee: ${formatProtocolFeeFormula(protocolConfig.phi, protocolConfig.floor_bps, protocolConfig.ceil_bps)}.`
            : ""}
        </Typography>

        {/* Amounts */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          You deposit
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
          {amountCard("x")}
          {amountCard("y")}
        </Box>

        {previewLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
              Balancing amounts...
            </Typography>
          </Box>
        )}
        {notDeployed && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {notDeployed}
          </Alert>
        )}
        {previewError && (
          <Alert severity={isNoMarketError(isNoMarket)} sx={{ mb: 1.5 }}>
            {isNoMarket
              ? "This pair has no market yet. Set the starting price above."
              : previewError}
          </Alert>
        )}

        {/* Summary */}
        <Box sx={{ ...cardSx, p: 2, bgcolor: "rgba(255,255,255,0.02)", mb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
              Value split
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
              {split
                ? `${split.xPct.toFixed(0)}% ${nameX} / ${split.yPct.toFixed(0)}% ${nameY}`
                : "—"}
            </Typography>
          </Box>
          {split && (
            <Box
              sx={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", mb: 0.75, bgcolor: "divider" }}
              aria-hidden
            >
              <Box sx={{ width: `${split.xPct}%`, bgcolor: "primary.main" }} />
              <Box sx={{ width: `${split.yPct}%`, bgcolor: "secondary.main" }} />
            </Box>
          )}
          {totalUsd !== null && amountXNum + amountYNum > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                Total value
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                {"≈"} ${formatFullNumber(totalUsd, 2)}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
              Takers pay
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
              {isValidFeePpm(feePpm) ? `${feePpmToPercent(feePpm)}%` : "—"}
              {preview?.protocol_fee_bps !== undefined
                ? ` + ${formatProtocolFeeBps(preview.protocol_fee_bps)} protocol`
                : ""}
            </Typography>
          </Box>
          {preview && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                  In position
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                  {formatAmountTrimmed(rawToHuman(preview.x, decX), decX)} {nameX} +{" "}
                  {formatAmountTrimmed(rawToHuman(preview.y, decY), decY)} {nameY}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                  Returned on withdraw
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                  {[
                    !isErgX && `${formatAmountTrimmed(rawToHuman(CL_TOKEN_DUST_RAW, decX), decX, decX)} ${nameX}`,
                    !isErgY && `${formatAmountTrimmed(rawToHuman(CL_TOKEN_DUST_RAW, decY), decY, decY)} ${nameY}`,
                    `${formatAmountTrimmed(rawToHuman(CL_POSITION_FLOOR_NANOERG + CL_KEY_BOX_NANOERG, 9), 9, 9)} ERG`,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                Kept in the position and key boxes; returned when you withdraw.
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                  Network fee
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                  {formatAmountTrimmed(minerFee / 1e9, 9, 9)} ERG
                </Typography>
              </Box>
            </>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0 }}>
            You earn fees only while the price is inside your range.
          </Typography>
        </Box>

        {side?.singleSided && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
              p: 1.5,
              mb: 1,
              borderRadius: "10px",
              bgcolor: `${theme.palette.warning.main}12`,
              border: `1px solid ${theme.palette.warning.main}44`,
            }}
          >
            <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: 20, mt: 0.25 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
              {side.holdsOnly === "x"
                ? `The range is above the current price, so this position holds only ${nameX} and earns nothing until the price rises into it.`
                : `The range is below the current price, so this position holds only ${nameY} and earns nothing until the price falls into it.`}
            </Typography>
          </Box>
        )}
        {insufficient && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            Your wallet does not hold enough for these amounts
            {balX !== undefined && tokenX === ERG_TOKEN_ID
              ? ` (keep about ${ERG_DEPOSIT_RESERVE_HUMAN} ERG for fees)`
              : ""}
            .
          </Alert>
        )}
        {clStatus?.message && (
          <Alert severity={clStatus.state === "killed" ? "warning" : "info"} sx={{ mb: 1 }}>
            {clStatus.message} Adding concentrated liquidity is disabled.
          </Alert>
        )}
        {!walletConnected && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Connect a Nautilus wallet to add liquidity.
          </Alert>
        )}
      </Box>

      <Box sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleCreate}
          disabled={!canCreate || clPaused}
          sx={{
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
            background: "linear-gradient(135deg, #5C6BC0 0%, #7E57C2 100%)",
            border: "1px solid transparent",
            boxShadow: "none !important",
            "&:hover": { background: "linear-gradient(135deg, #5C6BC0 0%, #9575CD 100%)", opacity: 0.9 },
            "&.Mui-disabled": { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" },
          }}
          startIcon={creating ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {creating
            ? "Creating position..."
            : !walletConnected
              ? "Connect wallet"
              : "Create Position"}
        </Button>
      </Box>
    </>
  );
};

function isNoMarketError(noMarket: boolean): "info" | "error" {
  return noMarket ? "info" : "error";
}

export default CustomRangeForm;
