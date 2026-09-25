import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { formatFullNumber } from "@lib/utils/general";
import { copyToClipboard } from "@lib/utils/clipboard";
import {
  ApiRequestError,
  ERG_TOKEN_ID,
  ERG_DECIMALS,
  feeBpsToPercent,
  formatProtocolFeeBps,
  isClNotDeployedError,
  rawToHuman,
  shortId,
} from "./clMath";
import { submitSignedTx } from "./walletTokens";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

const REFRESH_INTERVAL_MS = 15000;

export interface ClPair {
  tokenX: string;
  tokenY: string;
}

interface ClPositionDto {
  position_id: string;
  box_id: string;
  pair_type: "erg_token" | "token_token";
  token_x: string;
  token_y: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fee_bps: number;
  fee_x: number;
  fee_y: number;
  erg_value: number;
  price_lower: number;
  price_upper: number;
  price_current: number;
  liquidity: number;
  in_range: boolean;
  owned: boolean;
  /** Effective protocol-fee rate for this position's fee_bps, in bps of the
   * net input (`max(phi * fee_bps, floor_bps * 10000) / 10000`). */
  protocol_fee_bps: number;
}

interface ClTokenMeta {
  name: string;
  decimals: number;
}

interface PositionsResponse {
  positions: ClPositionDto[];
  tokens: Record<string, ClTokenMeta>;
  error?: string;
}

interface PositionsTableProps {
  userAddresses: string[];
  pair: ClPair | null;
  refreshTrigger: number;
  onChanged: () => void;
}

async function apiJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${process.env.CRUX_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON body, fall through to status-based error below
  }
  if (!response.ok) {
    const err: ApiRequestError = new Error(data?.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  if (data?.error) {
    const err: ApiRequestError = new Error(data.error);
    err.status = response.status;
    throw err;
  }
  return data as T;
}

const ERG_META: ClTokenMeta = { name: "ERG", decimals: ERG_DECIMALS };

const PositionsTable: FC<PositionsTableProps> = ({
  userAddresses,
  pair,
  refreshTrigger,
  onChanged,
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();

  const [positions, setPositions] = useState<ClPositionDto[]>([]);
  const [tokensMeta, setTokensMeta] = useState<Record<string, ClTokenMeta>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mineOnly, setMineOnly] = useState(false);
  const [busyPositionId, setBusyPositionId] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState<ClPositionDto | null>(
    null,
  );
  const [notDeployedMessage, setNotDeployedMessage] = useState<string | null>(null);

  const getTokenMeta = useCallback(
    (tokenId: string): ClTokenMeta => {
      if (tokenId === ERG_TOKEN_ID) return ERG_META;
      return tokensMeta[tokenId] || { name: shortId(tokenId, 4), decimals: 0 };
    },
    [tokensMeta],
  );

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { user_addresses: userAddresses };
      if (pair) {
        body.token_x = pair.tokenX;
        body.token_y = pair.tokenY;
      }
      const data = await apiJson<PositionsResponse>("/dex/cl/positions", body);
      setPositions(data.positions || []);
      setTokensMeta(data.tokens || {});
      setNotDeployedMessage(null);
    } catch (error: any) {
      console.error("Error fetching CL positions:", error);
      setNotDeployedMessage(isClNotDeployedError(error) ? error.message : null);
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddresses, pair?.tokenX, pair?.tokenY]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchPositions, refreshTrigger]);

  const displayedPositions = useMemo(
    () => (mineOnly ? positions.filter((p) => p.owned) : positions),
    [positions, mineOnly],
  );

  const runTx = async (
    endpoint: string,
    position: ClPositionDto,
    successVerb: string,
  ) => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }
    setBusyPositionId(position.position_id);
    try {
      const result = await apiJson<{ unsigned_tx: any }>(endpoint, {
        position_id: position.position_id,
        user_addresses: userAddresses,
        miner_fee: minerFee,
      });
      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();
      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await submitSignedTx(context, signedTx);
      addAlert("success", `${successVerb}! TX: ${txId.slice(0, 8)}...`);
      onChanged();
      fetchPositions();
    } catch (error: any) {
      console.error(`${successVerb} error:`, error);
      addAlert("error", error.message || `Failed to ${successVerb.toLowerCase()}`);
    } finally {
      setBusyPositionId(null);
    }
  };

  const handleCollect = (position: ClPositionDto) =>
    runTx("/dex/cl/collect", position, "Fees collected");

  const handleWithdrawConfirm = async () => {
    if (!confirmWithdraw) return;
    const position = confirmWithdraw;
    setConfirmWithdraw(null);
    await runTx("/dex/cl/withdraw", position, "Position withdrawn");
  };

  const formatHuman = (raw: number, decimals: number) =>
    formatFullNumber(rawToHuman(raw, decimals), decimals > 4 ? 6 : 2);

  const renderPair = (p: ClPositionDto) => {
    const xMeta = getTokenMeta(p.token_x);
    const yMeta = getTokenMeta(p.token_y);
    return (
      <Box>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
          {xMeta.name} / {yMeta.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
          {p.fee_bps} bps ({feeBpsToPercent(p.fee_bps)}%)
        </Typography>
      </Box>
    );
  };

  const renderRange = (p: ClPositionDto) => {
    const xMeta = getTokenMeta(p.token_x);
    const yMeta = getTokenMeta(p.token_y);
    // price_* are raw prices (Y per X in raw units). Convert via decimals.
    const toHumanPrice = (rawPrice: number) =>
      rawPrice * Math.pow(10, xMeta.decimals - yMeta.decimals);
    return (
      <Box sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2" sx={{ mb: 0 }}>
          {formatFullNumber(toHumanPrice(p.price_lower), 6)} &ndash;{" "}
          {formatFullNumber(toHumanPrice(p.price_upper), 6)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
          raw {p.price_lower.toLocaleString()} &ndash; {p.price_upper.toLocaleString()}
        </Typography>
      </Box>
    );
  };

  const renderCurrentPrice = (p: ClPositionDto) => {
    const xMeta = getTokenMeta(p.token_x);
    const yMeta = getTokenMeta(p.token_y);
    const humanPrice = p.price_current * Math.pow(10, xMeta.decimals - yMeta.decimals);
    return (
      <Box sx={{ whiteSpace: "nowrap" }}>
        <Typography variant="body2" sx={{ mb: 0 }}>
          {formatFullNumber(humanPrice, 6)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
          raw {p.price_current.toLocaleString()}
        </Typography>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ mb: 0 }}>
            Positions
          </Typography>
          {pair && (
            <Typography variant="caption" color="text.secondary">
              Filtered to {getTokenMeta(pair.tokenX).name} /{" "}
              {getTokenMeta(pair.tokenY).name}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {loading && !initialLoading && <CircularProgress size={16} />}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={mineOnly}
                onChange={(e) => setMineOnly(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Mine only</Typography>}
          />
        </Box>
      </Box>

      {notDeployedMessage && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {notDeployedMessage}
        </Alert>
      )}

      {initialLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : notDeployedMessage ? null : displayedPositions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {mineOnly
            ? "You don't own any positions for this filter."
            : "No positions found."}
        </Typography>
      ) : (
        <TableContainer sx={{ "& td, & th": { verticalAlign: "middle" }, "& p": { mb: 0 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pair</TableCell>
                <TableCell>Range</TableCell>
                <TableCell>Current price</TableCell>
                <TableCell align="center">In range</TableCell>
                <TableCell align="right">Reserve X</TableCell>
                <TableCell align="right">Reserve Y</TableCell>
                <TableCell align="right">Fees X/Y</TableCell>
                <TableCell align="right">Protocol fee</TableCell>
                <TableCell>Position id</TableCell>
                <TableCell align="center">Owned</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedPositions.map((p) => {
                const xMeta = getTokenMeta(p.token_x);
                const yMeta = getTokenMeta(p.token_y);
                const isBusy = busyPositionId === p.position_id;
                return (
                  <TableRow key={p.position_id} hover>
                    <TableCell>{renderPair(p)}</TableCell>
                    <TableCell>{renderRange(p)}</TableCell>
                    <TableCell>{renderCurrentPrice(p)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={p.in_range ? "In range" : "Out of range"}
                        size="small"
                        color={p.in_range ? "success" : "default"}
                        variant={p.in_range ? "filled" : "outlined"}
                        sx={{ height: 20, fontSize: "0.65rem" }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2">
                        {formatHuman(p.x, xMeta.decimals)} {xMeta.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw {p.x.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2">
                        {formatHuman(p.y, yMeta.decimals)} {yMeta.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw {p.y.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2">
                        {formatHuman(p.fee_x, xMeta.decimals)} /{" "}
                        {formatHuman(p.fee_y, yMeta.decimals)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw {p.fee_x.toLocaleString()} / {p.fee_y.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2">{formatProtocolFeeBps(p.protocol_fee_bps)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="caption">
                          {shortId(p.position_id)}
                        </Typography>
                        <Tooltip title="Copy position id">
                          <IconButton
                            size="small"
                            sx={{ p: 0.25 }}
                            onClick={() => {
                              copyToClipboard(p.position_id);
                              addAlert("success", "Position id copied");
                            }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {p.owned && (
                        <Chip
                          label="Owned"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {p.owned ? (
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                          <Tooltip title="Collect accrued fees, keep the position">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={isBusy}
                                onClick={() => handleCollect(p)}
                              >
                                {isBusy ? <CircularProgress size={14} /> : "Collect"}
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Close the position, return reserves + fees, burn the key">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                disabled={isBusy}
                                onClick={() => setConfirmWithdraw(p)}
                              >
                                {isBusy ? <CircularProgress size={14} /> : "Withdraw"}
                              </Button>
                            </span>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          &mdash;
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!confirmWithdraw} onClose={() => setConfirmWithdraw(null)}>
        <DialogTitle>Withdraw position</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This closes the position and returns the reserves plus accrued
            fees to your wallet. The key NFT is burned &mdash; you will not be
            able to collect from or withdraw this position again.
          </Typography>
          {confirmWithdraw && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: theme.palette.background.default,
                borderRadius: 1,
              }}
            >
              <Typography variant="body2">
                <strong>Position id:</strong> {shortId(confirmWithdraw.position_id)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmWithdraw(null)}>Keep position</Button>
          <Button onClick={handleWithdrawConfirm} color="error" variant="contained">
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PositionsTable;
