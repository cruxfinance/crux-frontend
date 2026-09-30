import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useRouter } from "next/router";
import { resolveIcons } from "@lib/utils/icons";
import {
  NO_VALUE,
  clPositionsHref,
  formatAprFraction,
  formatErgAmount,
  formatUsdAmount,
  sortPairsByTvl,
} from "./clFormat";
import { ERG_TOKEN_ID, shortId } from "./clMath";
import type { ClPairStats, ClPairsResponse, ClTokenMeta } from "./clTypes";

const REFRESH_INTERVAL_MS = 60000;

async function fetchPairs(): Promise<ClPairsResponse> {
  const response = await fetch(`${process.env.CRUX_API}/dex/cl/pairs`);
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON body, handled by the status check below
  }
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data as ClPairsResponse;
}

/**
 * "Concentrated liquidity" section of the liquidity page: one row per CL
 * pair from `GET /dex/cl/pairs`, each linking to the CL page with the pair
 * preselected.
 */
const ClPairsTable: FC = () => {
  const router = useRouter();
  const [pairs, setPairs] = useState<ClPairStats[]>([]);
  const [tokens, setTokens] = useState<Record<string, ClTokenMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [icons, setIcons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await fetchPairs();
      setPairs(data.pairs || []);
      setTokens(data.tokens || {});
      setError(null);
      const ids = new Set<string>();
      (data.pairs || []).forEach((p) => {
        ids.add(p.token_x);
        ids.add(p.token_y);
      });
      const resolved = resolveIcons([...ids]);
      if (Object.keys(resolved).length > 0) {
        setIcons((prev) => ({ ...prev, ...resolved }));
      }
    } catch (e: any) {
      console.error("Error fetching CL pairs:", e);
      setError(e?.message || "Failed to load concentrated liquidity pairs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const sorted = useMemo(() => sortPairsByTvl(pairs), [pairs]);

  const tokenName = (id: string) =>
    id === ERG_TOKEN_ID ? "ERG" : tokens[id]?.name || shortId(id, 4);

  const renderPair = (p: ClPairStats) => {
    const xName = tokenName(p.token_x);
    const yName = tokenName(p.token_y);
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Avatar
            src={icons[p.token_y]}
            sx={{ width: 24, height: 24, fontSize: "0.75rem" }}
          >
            {yName?.[0]}
          </Avatar>
          <Avatar
            src={icons[p.token_x]}
            sx={{ width: 24, height: 24, ml: -0.5, fontSize: "0.75rem" }}
          >
            {xName?.[0]}
          </Avatar>
        </Box>
        <Typography variant="body2" component="span" fontWeight={500} sx={{ mb: 0 }}>
          {yName} / {xName}
        </Typography>
        <Chip label="CL" size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
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
        <Typography variant="h6" sx={{ mb: 0 }}>
          Concentrated Liquidity
        </Typography>
        <Button size="small" variant="outlined" onClick={() => router.push(clPositionsHref())}>
          Manage positions
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : error ? (
        <Alert severity="warning">
          Concentrated liquidity pairs are unavailable right now: {error}
        </Alert>
      ) : (
        <TableContainer sx={{ "& td, & th": { verticalAlign: "middle" }, "& p": { mb: 0 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pair</TableCell>
                <TableCell align="right">Positions</TableCell>
                <TableCell align="right">TVL</TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  Volume 24h
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  Fees 24h
                </TableCell>
                <TableCell align="right">
                  <Tooltip
                    title="Estimated annualized fee yield on the liquidity currently in range, from the last 7 days of fees."
                    arrow
                    placement="top"
                  >
                    <span>
                      APR
                      <InfoOutlinedIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.5, verticalAlign: "middle" }} />
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={`${p.token_x}/${p.token_y}`} hover>
                  <TableCell>{renderPair(p)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {p.positions_in_range}
                    <Typography variant="caption" color="text.secondary" component="span">
                      {" "}
                      / {p.positions} in range
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {formatErgAmount(p.tvl_erg)}{" "}
                    {p.tvl_usd !== null && (
                      <Typography variant="caption" color="text.secondary" component="span">
                        ({formatUsdAmount(p.tvl_usd)})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "table-cell" } }}
                  >
                    {formatErgAmount(p.volume_24h_erg)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "table-cell" } }}
                  >
                    {formatErgAmount(p.fees_24h_erg)}
                  </TableCell>
                  <TableCell align="right">
                    {p.apr === null ? (
                      NO_VALUE
                    ) : (
                      <Typography variant="body2" component="span" color="success.main" sx={{ mb: 0 }}>
                        {formatAprFraction(p.apr)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => router.push(clPositionsHref(p))}
                      sx={{
                        whiteSpace: "nowrap",
                        "tr:hover &": {
                          borderColor: "primary.main",
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        },
                      }}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No concentrated liquidity pairs yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default ClPairsTable;
