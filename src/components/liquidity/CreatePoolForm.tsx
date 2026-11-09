import React, { FC, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { ERG_TOKEN_ID, formatWalletBalanceHuman, rawToHuman, trimDecimalZeros } from "@components/cl/clMath";
import type { MergedPair } from "@components/cl/clLiquidity";
import {
  CP_ERG_FEE_RESERVE_NANOERG,
  CP_N2T_LOCKED_NANOERG,
  CP_PRICE_WARN_FRACTION,
  CP_T2T_LOCKED_NANOERG,
  bpsToPercentText,
  clPriceRightPerLeft,
  cpKindFor,
  lpTokensPreview,
  parseRaw,
  poolPriceRightPerLeft,
  priceDifference,
  rawToNumber,
  rawToText,
} from "@components/cl/cpCreateMath";
import type { CruxCpPool } from "@components/cl/cpCreateMath";
import { useCpCreate } from "@components/cl/useCpCreate";
import type { CpCreateStage } from "@components/cl/useCpCreate";
import { useCpTiers } from "@components/cl/useCpData";
import { fetchWalletBalances } from "@components/cl/walletTokens";

const DEFAULT_FEE_BPS = 30;
/** Tiers up to this fee are buttons; the rest sit in the "More" select. */
const MAX_BUTTON_FEE_BPS = 100;

const cardSx = {
  borderRadius: "12px",
  bgcolor: "rgba(255,255,255,0.03)",
  border: "1px solid",
  borderColor: "divider",
  p: 2,
} as const;

interface CreatePoolFormProps {
  pair: MergedPair;
  userAddresses: string[];
  walletConnected: boolean;
  icons: Record<string, string>;
  /** Fresh Crux pools of the pair, to spot tiers that already exist. */
  cruxPools: CruxCpPool[];
  /** Switch the modal to an existing pool's deposit form. */
  onExistingPool: (poolId: string) => void;
  /** "Done" on the success panel. */
  onDone: () => void;
}

function formatPrice(p: number): string {
  return p > 0 ? trimDecimalZeros(p.toFixed(p >= 1 ? 4 : 8)) : "—";
}

type StepState = "pending" | "active" | "done" | "failed";

function stepStates(stage: CpCreateStage): [StepState, StepState] {
  switch (stage) {
    case "requesting":
    case "signing1":
    case "submitting1":
      return ["active", "pending"];
    case "signing2":
    case "submitting2":
      return ["done", "active"];
    case "step2Failed":
      return ["done", "failed"];
    case "done":
      return ["done", "done"];
    default:
      return ["pending", "pending"];
  }
}

const StepMark: FC<{ state: StepState }> = ({ state }) => {
  const theme = useTheme();
  if (state === "done") return <CheckCircleOutlineIcon sx={{ fontSize: 18, color: theme.palette.success.main }} />;
  if (state === "active") return <CircularProgress size={16} />;
  if (state === "failed") return <ErrorOutlineIcon sx={{ fontSize: 18, color: theme.palette.error.main }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.disabled" }} />;
};

const CreatePoolForm: FC<CreatePoolFormProps> = ({
  pair,
  userAddresses,
  walletConnected,
  icons,
  cruxPools,
  onExistingPool,
  onDone,
}) => {
  const theme = useTheme();
  const tiers = useCpTiers();
  const { stage, running, error, result, start, retryStep2, reset } = useCpCreate(userAddresses, {
    onExists: onExistingPool,
  });

  const [feeChoice, setFeeChoice] = useState<number | null>(null);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [balances, setBalances] = useState<Map<string, number> | null>(null);

  const info = (id: string) =>
    id === pair.tokenX
      ? { name: pair.nameX, decimals: pair.decimalsX }
      : { name: pair.nameY, decimals: pair.decimalsY };
  const leftId = pair.leftId;
  const rightId = pair.rightId;
  const left = info(leftId);
  const right = info(rightId);
  const kind = cpKindFor(pair.tokenX, pair.tokenY);

  const created = stage === "done";
  useEffect(() => {
    if (!walletConnected) return;
    let cancelled = false;
    fetchWalletBalances().then((b) => !cancelled && setBalances(b));
    return () => {
      cancelled = true;
    };
  }, [walletConnected, created]);

  const feeBps = useMemo(() => {
    if (!tiers || tiers.length === 0) return null;
    if (feeChoice !== null && tiers.some((t) => t.fee_bps === feeChoice)) return feeChoice;
    return (tiers.find((t) => t.fee_bps === DEFAULT_FEE_BPS) ?? tiers[0]).fee_bps;
  }, [tiers, feeChoice]);
  const tier = tiers?.find((t) => t.fee_bps === feeBps) ?? null;
  const buttonTiers = (tiers ?? []).filter((t) => t.fee_bps <= MAX_BUTTON_FEE_BPS);
  const moreTiers = (tiers ?? []).filter((t) => t.fee_bps > MAX_BUTTON_FEE_BPS);
  const existingFor = (bps: number) => cruxPools.find((p) => p.lp_fee_bps === bps);

  const pickTier = (bps: number) => {
    const existing = existingFor(bps);
    if (existing) onExistingPool(existing.pool_id);
    else setFeeChoice(bps);
  };

  const leftRaw = parseRaw(leftText, left.decimals);
  const rightRaw = parseRaw(rightText, right.decimals);
  const rawOf = (id: string) => (id === leftId ? leftRaw : rightRaw);
  const amountX = rawOf(pair.tokenX);
  const amountY = rawOf(pair.tokenY);
  const hasAmounts = leftRaw > BigInt(0) && rightRaw > BigInt(0);

  const balanceOf = (id: string): bigint | undefined => {
    const b = balances?.get(id);
    return b === undefined ? undefined : BigInt(Math.trunc(b));
  };
  const exceedsBalance = (id: string) => {
    const bal = balanceOf(id);
    return bal !== undefined && rawOf(id) > bal;
  };

  const ergBalance = balanceOf(ERG_TOKEN_ID);
  const ergRaw = rawOf(ERG_TOKEN_ID);
  const belowFloor = kind === "n2t" && ergRaw > BigInt(0) && ergRaw <= CP_N2T_LOCKED_NANOERG;
  const ergShortForPool =
    kind === "t2t" &&
    ergBalance !== undefined &&
    ergBalance < CP_T2T_LOCKED_NANOERG + CP_ERG_FEE_RESERVE_NANOERG;

  const helperFor = (id: string): string | null => {
    if (exceedsBalance(id)) return "More than your wallet balance";
    if (id === ERG_TOKEN_ID && belowFloor) {
      return "An ERG pool needs more than 2.4 ERG, which stays locked as its storage-rent reserve";
    }
    return null;
  };

  const maxRawFor = (id: string): bigint | undefined => {
    const bal = balanceOf(id);
    if (bal === undefined || ergShortForPool) return undefined;
    const max = id === ERG_TOKEN_ID ? bal - CP_ERG_FEE_RESERVE_NANOERG : bal;
    return max > BigInt(0) ? max : BigInt(0);
  };
  const onMax = (id: string) => {
    const max = maxRawFor(id);
    if (max === undefined) return;
    const text = rawToText(max, info(id).decimals);
    if (id === leftId) setLeftText(text);
    else setRightText(text);
  };

  // Opening price in human units: 1 left = p right.
  const leftHuman = rawToNumber(leftRaw, left.decimals);
  const rightHuman = rawToNumber(rightRaw, right.decimals);
  const openingPrice = hasAmounts ? rightHuman / leftHuman : null;

  const marketPrice = useMemo(() => {
    if (pair.pool) {
      const p = poolPriceRightPerLeft(pair.pool, leftId);
      if (p !== null) return p;
    }
    return pair.cl ? clPriceRightPerLeft(pair.cl.price_current, leftId, pair.tokenX) : null;
  }, [pair, leftId]);
  const diff = openingPrice !== null ? priceDifference(openingPrice, marketPrice) : null;

  const lpPreview = lpTokensPreview(leftRaw, rightRaw);
  const lockedNanoerg = kind === "n2t" ? CP_N2T_LOCKED_NANOERG : CP_T2T_LOCKED_NANOERG;

  const canCreate =
    walletConnected &&
    !running &&
    tier !== null &&
    hasAmounts &&
    !exceedsBalance(leftId) &&
    !exceedsBalance(rightId) &&
    !belowFloor &&
    !ergShortForPool;

  const handleCreate = () => {
    if (!canCreate || feeBps === null) return;
    start({
      tokenX: pair.tokenX,
      tokenY: pair.tokenY,
      amountX,
      amountY,
      feeBps,
    });
  };

  const tokenChip = (id: string) => (
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
        {info(id).name?.[0]}
      </Avatar>
      <Typography variant="body1" fontWeight={600} sx={{ mb: 0 }}>
        {info(id).name}
      </Typography>
    </Box>
  );

  const amountCard = (id: string) => {
    const value = id === leftId ? leftText : rightText;
    const setValue = id === leftId ? setLeftText : setRightText;
    const bal = balanceOf(id);
    const helper = helperFor(id);
    return (
      <Box sx={{ ...cardSx, mb: 1.5, borderColor: helper ? "error.main" : "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {tokenChip(id)}
          <TextField
            fullWidth
            variant="standard"
            type="number"
            value={value}
            disabled={running}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            inputProps={{ min: 0, step: "any", "aria-label": `${info(id).name} amount` }}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, minHeight: 24 }}>
          {walletConnected && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
                Balance:{" "}
                {bal !== undefined
                  ? formatWalletBalanceHuman(rawToHuman(Number(bal), info(id).decimals))
                  : "—"}
              </Typography>
              <Button
                size="small"
                sx={{ minWidth: 0, py: 0, px: 0.75, fontSize: "0.7rem" }}
                disabled={running || maxRawFor(id) === undefined}
                onClick={() => onMax(id)}
              >
                Max
              </Button>
            </>
          )}
        </Box>
        {helper && (
          <Typography variant="caption" color="error" sx={{ mb: 0, display: "block" }}>
            {helper}
          </Typography>
        )}
      </Box>
    );
  };

  const feeText = (bps: number) => `${bpsToPercentText(bps)}%`;
  const explorerTx = (id: string) => (
    <MuiLink
      href={`https://explorer.ergoplatform.com/en/transactions/${id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {id.slice(0, 10)}...
    </MuiLink>
  );

  if (stage === "done" && result) {
    return (
      <Box sx={{ px: 3, pb: 3, pt: 1, textAlign: "center" }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 56, color: theme.palette.success.main, mb: 1 }} />
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          Pool created: {left.name} / {right.name} · {feeText(result.fee_bps)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          LP tokens received: {safeLocale(result.lp_tokens_received)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          It appears in the list once the transaction confirms.
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5, wordBreak: "break-all" }}>
          Mint transaction: {explorerTx(result.mint_tx_id)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, wordBreak: "break-all" }}>
          Create transaction: {explorerTx(result.create_tx_id)}
        </Typography>
        <Button fullWidth variant="contained" onClick={onDone} sx={{ borderRadius: "12px", py: 1.25 }}>
          Done
        </Button>
      </Box>
    );
  }

  const [step1, step2] = stepStates(stage);
  const showSteps = running || stage === "step2Failed";

  return (
    <>
      <Box sx={{ px: 3, pb: 0 }}>
        {/* Fee tier */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Fee tier
        </Typography>
        {tiers === null ? (
          <CircularProgress size={18} sx={{ mb: 1 }} />
        ) : tiers.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            Could not load the fee tiers. Try again in a moment.
          </Alert>
        ) : (
          <Box sx={{ display: "flex", gap: 1, alignItems: "stretch", mb: 0.5 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={feeBps}
              disabled={running}
              sx={{
                flexGrow: 1,
                "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, flex: 1, flexDirection: "column", py: 0.5 },
              }}
            >
              {buttonTiers.map((t) => (
                // onClick, not the group's onChange: re-clicking the selected tier must still
                // switch to its pool when that tier already exists.
                <ToggleButton key={t.fee_bps} value={t.fee_bps} onClick={() => pickTier(t.fee_bps)}>
                  {feeText(t.fee_bps)}
                  {existingFor(t.fee_bps) && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0, lineHeight: 1 }}>
                      exists
                    </Typography>
                  )}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {moreTiers.length > 0 && (
              <TextField
                select
                size="small"
                label="More"
                value={feeBps !== null && feeBps > MAX_BUTTON_FEE_BPS ? feeBps : ""}
                disabled={running}
                onChange={(e) => pickTier(Number(e.target.value))}
                sx={{ minWidth: 110 }}
              >
                {moreTiers.map((t) => (
                  <MenuItem key={t.fee_bps} value={t.fee_bps}>
                    {feeText(t.fee_bps)}
                    {existingFor(t.fee_bps) ? " (exists)" : ""}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        )}
        {tier && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            LP fee {trimPct(tier.lp_fee_pct)}%
            {tier.protocol_fee_pct !== null && ` + protocol fee ${tier.protocol_fee_pct.toFixed(2)}%`} per
            swap
          </Typography>
        )}

        {/* Amounts */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          You deposit
        </Typography>
        {amountCard(leftId)}
        {amountCard(rightId)}

        {/* Summary */}
        <Box sx={{ ...cardSx, p: 2, mb: 1.5, mt: 0.5 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {openingPrice !== null
              ? `Opening price: 1 ${left.name} = ${formatPrice(openingPrice)} ${right.name}`
              : "Opening price: —"}
          </Typography>
          {openingPrice !== null && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {`1 ${right.name} = ${formatPrice(1 / openingPrice)} ${left.name}`}
            </Typography>
          )}
          {diff !== null && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {`Difference to market: ${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)}%`}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {hasAmounts
              ? `You receive: ${lpPreview.toLocaleString("en-US")} LP tokens`
              : "You receive: —"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0, display: "block" }}>
            {kind === "n2t"
              ? `Locked as storage-rent reserve: ${rawToText(lockedNanoerg, 9)} ERG (part of the ERG you deposit; it stays in the pool)`
              : `Locked as storage-rent reserve: ${rawToText(lockedNanoerg, 9)} ERG extra, locked in the pool box`}
          </Typography>
        </Box>

        {diff !== null && Math.abs(diff) > CP_PRICE_WARN_FRACTION && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            The opening price differs from the current market by {(Math.abs(diff) * 100).toFixed(1)}%.
            Arbitrage would move the pool to the market price at your cost.
          </Alert>
        )}
        {ergShortForPool && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            A token pool also needs {rawToText(CP_T2T_LOCKED_NANOERG, 9)} ERG for the pool box, plus fees.
          </Alert>
        )}
        {!walletConnected && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Connect a Nautilus wallet to create a pool.
          </Alert>
        )}

        {showSteps && (
          <Box sx={{ ...cardSx, mb: 1.5 }}>
            {([
              ["1 of 2: mint the pool NFT", step1],
              ["2 of 2: create the pool", step2],
            ] as const).map(([label, state]) => (
              <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
                <StepMark state={state} />
                <Typography
                  variant="body2"
                  color={state === "pending" ? "text.secondary" : "text.primary"}
                  sx={{ mb: 0 }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {stage === "step2Failed" && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            The pool NFT is minted, but the pool was not created yet.
            {error && <> ({error})</>}
            <br />
            If it keeps failing, wait for the first transaction to confirm, then retry.
          </Alert>
        )}
        {error && stage !== "step2Failed" && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Box sx={{ px: 3, pb: 3, pt: 1 }}>
        {stage === "step2Failed" ? (
          <>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={retryStep2}
              sx={{ py: 1.5, borderRadius: "12px", fontSize: "1rem", fontWeight: 600, textTransform: "none" }}
            >
              Retry step 2
            </Button>
            <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <Button size="small" variant="text" color="inherit" onClick={reset} sx={{ textTransform: "none" }}>
                Start over
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
                The minted NFT stays in your wallet unused.
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Creating a pool takes two transactions. Your wallet will ask you to sign twice.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleCreate}
              disabled={!canCreate}
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
              startIcon={running ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {running ? "Creating pool..." : "Create pool"}
            </Button>
          </>
        )}
      </Box>
    </>
  );
};

function trimPct(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function safeLocale(n: number | string): string {
  try {
    return BigInt(n).toLocaleString("en-US");
  } catch {
    return String(n);
  }
}

export default CreatePoolForm;
