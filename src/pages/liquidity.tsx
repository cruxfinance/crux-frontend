import React, { FC, useState, useEffect, useMemo, useCallback } from "react";
import {
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  CircularProgress,
  TextField,
  InputAdornment,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { resolveIcons as batchResolveIcons } from "@lib/utils/icons";
import { useWallet } from "@lib/contexts/WalletContext";
import { trpc } from "@lib/trpc";
import { formatNumber } from "@lib/utils/general";
import { useRouter } from "next/router";
import AddLiquidityModal from "@components/liquidity/AddLiquidityModal";
import RemoveLiquidityModal from "@components/liquidity/RemoveLiquidityModal";

const ERG_TOKEN_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";

interface PoolWithApr {
  pool_id: string;
  pool_type: string;
  base_token_id: string;
  base_token_name: string;
  base_token_decimals: number;
  quote_token_id: string;
  quote_token_name: string;
  quote_token_decimals: number;
  base_amount: number;
  quote_amount: number;
  tvl_erg: number;
  fee_pct: number;
  volume_24h: number;
  apr_7d: number | null;
  apr_30d: number | null;
}

interface LpPosition {
  pool_id: string;
  pool_type: string;
  lp_token_id: string;
  lp_token_name: string;
  lp_token_amount: number;
  share_of_pool: number;
  base_token: {
    token_id: string;
    name: string;
    decimals: number;
    amount: number;
    value_usd: number;
  };
  quote_token: {
    token_id: string;
    name: string;
    decimals: number;
    amount: number;
    value_usd: number;
  };
  total_value_usd: number;
  pool_tvl_usd: number;
}

type SortField = "tvl_erg" | "volume_24h" | "fee_pct" | "apr_7d" | "apr_30d";
type SortDirection = "asc" | "desc";

const LiquidityPage: FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));

  // Pool list state
  const [pools, setPools] = useState<PoolWithApr[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("tvl_erg");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [visibleCount, setVisibleCount] = useState(10);

  // Positions state
  const [positions, setPositions] = useState<LpPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  // Icon cache
  const [icons, setIcons] = useState<Record<string, string>>({});

  // Modal state
  const [addModalPool, setAddModalPool] = useState<PoolWithApr | null>(null);
  const [removeModalPosition, setRemoveModalPosition] =
    useState<LpPosition | null>(null);

  // ERG price
  const [ergPrice, setErgPrice] = useState(0);

  // User authentication
  const { sessionStatus, dAppWallet } = useWallet();
  const isAuthenticated = sessionStatus === "authenticated";

  const walletQuery = trpc.user.getWallets.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const userAddresses = useMemo(() => {
    if (dAppWallet.connected && dAppWallet.addresses.length > 0) {
      return dAppWallet.addresses;
    }
    if (!walletQuery.data) return [];
    const extractAddresses = (
      wallets: typeof walletQuery.data.walletList | undefined,
    ) =>
      wallets?.flatMap((w) => [
        w.changeAddress,
        ...(w.usedAddresses || []),
        ...(w.unusedAddresses || []),
      ]) || [];
    const addresses = [
      ...extractAddresses(walletQuery.data.walletList),
      ...extractAddresses(walletQuery.data.addedWalletList),
    ];
    return [...new Set(addresses)];
  }, [dAppWallet, walletQuery.data]);

  // Fetch ERG price
  useEffect(() => {
    const fetchErgPrice = async () => {
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/coingecko/erg_price`,
        );
        const data = await response.json();
        if (data.price) setErgPrice(data.price);
      } catch (error) {
        console.error("Error fetching ERG price:", error);
      }
    };
    fetchErgPrice();
  }, []);

  // Fetch pools
  const fetchPools = useCallback(async () => {
    setPoolsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (searchQuery) params.set("search", searchQuery);
      const response = await fetch(
        `${process.env.CRUX_API}/dex/pools_apr?${params}`,
      );
      if (response.ok) {
        const data: PoolWithApr[] = await response.json();
        setPools(data);
        // Resolve icons for all tokens
        const tokenIds = new Set<string>();
        data.forEach((p) => {
          tokenIds.add(p.base_token_id);
          tokenIds.add(p.quote_token_id);
        });
        resolveIcons([...tokenIds]);
      }
    } catch (error) {
      console.error("Error fetching pools:", error);
    } finally {
      setPoolsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCount(10);
    const debounce = setTimeout(fetchPools, 300);
    return () => clearTimeout(debounce);
  }, [fetchPools]);

  // Fetch user positions
  useEffect(() => {
    if (userAddresses.length === 0) {
      setPositions([]);
      return;
    }
    const fetchPositions = async () => {
      setPositionsLoading(true);
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/dex/lp_positions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_addresses: userAddresses,
              limit: 50,
              offset: 0,
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.positions) {
            setPositions(data.positions);
            // Resolve icons for position tokens
            const tokenIds = new Set<string>();
            data.positions.forEach((p: LpPosition) => {
              tokenIds.add(p.base_token.token_id);
              tokenIds.add(p.quote_token.token_id);
            });
            resolveIcons([...tokenIds]);
          }
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      } finally {
        setPositionsLoading(false);
      }
    };
    fetchPositions();
  }, [userAddresses]);

  const resolveIcons = (tokenIds: string[]) => {
    const resolved = batchResolveIcons(tokenIds);
    if (Object.keys(resolved).length > 0) {
      setIcons((prev) => ({ ...prev, ...resolved }));
    }
  };

  // Sorted pools
  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      const aVal = a[sortField] ?? -Infinity;
      const bVal = b[sortField] ?? -Infinity;
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [pools, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatTokenAmount = (amount: number, decimals: number) => {
    return formatNumber(amount / Math.pow(10, decimals), decimals > 4 ? 4 : 2);
  };

  const renderTokenPair = (
    baseId: string,
    baseName: string,
    quoteId: string,
    quoteName: string,
    poolType?: string,
  ) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}>
      <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Avatar
          src={icons[quoteId]}
          sx={{ width: 24, height: 24, fontSize: "0.75rem" }}
        >
          {quoteName?.[0]}
        </Avatar>
        <Avatar
          src={icons[baseId]}
          sx={{ width: 24, height: 24, ml: -0.5, fontSize: "0.75rem" }}
        >
          {baseName?.[0]}
        </Avatar>
      </Box>
      <Typography variant="body2" component="span" fontWeight={500} sx={{ mb: 0 }}>
        {quoteName} / {baseName}
      </Typography>
      {poolType && (
        <Chip
          label={poolType}
          size="small"
          sx={{ height: 18, fontSize: "0.65rem" }}
        />
      )}
    </Box>
  );

  const formatApr = (apr: number | null) => {
    if (apr === null) return "—";
    if (apr === 0) return (
      <Typography variant="body2" color="text.secondary" component="span" sx={{ mb: 0 }}>
        —
      </Typography>
    );
    const color =
      apr > 0
        ? theme.palette.success.main
        : theme.palette.error.main;
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="body2" component="span" sx={{ color, mb: 0 }}>
          {apr.toFixed(2)}%
        </Typography>
        {apr > 50 && (
          <Tooltip title="High APR on low-liquidity pool — returns may be volatile" arrow>
            <WarningAmberIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
          </Tooltip>
        )}
      </Box>
    );
  };

  const formatFee = (feePct: number) => {
    const color =
      feePct <= 0.3
        ? theme.palette.success.main
        : feePct > 1.0
          ? theme.palette.warning.main
          : "inherit";
    return (
      <Typography variant="body2" component="span" sx={{ color, mb: 0 }}>
        {feePct.toFixed(1)}%
      </Typography>
    );
  };

  const totalTvlUsd = useMemo(
    () => pools.reduce((sum, p) => sum + p.tvl_erg * ergPrice, 0),
    [pools, ergPrice],
  );

  const totalPositionsUsd = useMemo(
    () => positions.reduce((sum, p) => sum + p.total_value_usd, 0),
    [positions],
  );

  return (
    <Box sx={{ p: upMd ? 3 : 1.5, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Liquidity
      </Typography>

      {/* Summary Stats */}
      <Paper
        sx={{
          display: "flex",
          gap: 3,
          mb: 3,
          p: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Total Value Locked
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            ${formatNumber(totalTvlUsd, 0)}
          </Typography>
        </Box>
        {isAuthenticated && positions.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Your Positions
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              ${formatNumber(totalPositionsUsd, 2)}
            </Typography>
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary">
            Pools
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            {pools.length}
          </Typography>
        </Box>
      </Paper>

      {/* Your Positions */}
      {isAuthenticated && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Your Positions
          </Typography>
          {positionsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : positions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No LP positions found. Add liquidity to a pool below to get
              started.
            </Typography>
          ) : (
            <TableContainer sx={{ "& td, & th": { verticalAlign: "middle" }, "& p": { mb: 0 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Pool</TableCell>
                    <TableCell align="right">Value (USD)</TableCell>
                    <TableCell align="right">Base</TableCell>
                    <TableCell align="right">Quote</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.map((pos) => {
                    // Find matching pool for APR
                    const pool = pools.find((p) => p.pool_id === pos.pool_id);
                    return (
                      <TableRow key={pos.pool_id + pos.lp_token_id}>
                        <TableCell>
                          {renderTokenPair(
                            pos.base_token.token_id,
                            pos.base_token.name,
                            pos.quote_token.token_id,
                            pos.quote_token.name,
                            pos.pool_type,
                          )}
                        </TableCell>
                        <TableCell align="right">
                          ${formatNumber(pos.total_value_usd, 2)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {formatTokenAmount(
                            pos.base_token.amount,
                            pos.base_token.decimals,
                          )}{" "}
                          <Typography variant="caption" color="text.secondary" component="span">
                            {pos.base_token.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {formatTokenAmount(
                            pos.quote_token.amount,
                            pos.quote_token.decimals,
                          )}{" "}
                          <Typography variant="caption" color="text.secondary" component="span">
                            {pos.quote_token.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}
                          >
                            {pool && (
                              <Tooltip title="Add Liquidity">
                                <IconButton
                                  size="small"
                                  onClick={() => setAddModalPool(pool)}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Remove Liquidity">
                              <IconButton
                                size="small"
                                onClick={() => setRemoveModalPosition(pos)}
                              >
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* All Pools */}
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
          <Typography variant="h6">All Pools</Typography>
          <TextField
            size="small"
            placeholder="Search pools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: "100%", md: 250 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {poolsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <TableContainer sx={{ "& td, & th": { verticalAlign: "middle" }, "& p": { mb: 0 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pool</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === "tvl_erg"}
                      direction={
                        sortField === "tvl_erg" ? sortDirection : "desc"
                      }
                      onClick={() => handleSort("tvl_erg")}
                    >
                      TVL
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                    <TableSortLabel
                      active={sortField === "volume_24h"}
                      direction={
                        sortField === "volume_24h" ? sortDirection : "desc"
                      }
                      onClick={() => handleSort("volume_24h")}
                    >
                      Volume 24h
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                    <TableSortLabel
                      active={sortField === "fee_pct"}
                      direction={
                        sortField === "fee_pct" ? sortDirection : "desc"
                      }
                      onClick={() => handleSort("fee_pct")}
                    >
                      Fee
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                    <Tooltip
                      title="Estimated annualized fee yield over the last 7 days, based on growth of underlying reserves per LP token. Does not account for impermanent loss."
                      arrow
                      placement="top"
                    >
                      <TableSortLabel
                        active={sortField === "apr_7d"}
                        direction={
                          sortField === "apr_7d" ? sortDirection : "desc"
                        }
                        onClick={() => handleSort("apr_7d")}
                      >
                        APR 7d
                        <InfoOutlinedIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.5 }} />
                      </TableSortLabel>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip
                      title="Estimated annualized fee yield over the last 30 days, based on growth of underlying reserves per LP token. Does not account for impermanent loss."
                      arrow
                      placement="top"
                    >
                      <TableSortLabel
                        active={sortField === "apr_30d"}
                        direction={
                          sortField === "apr_30d" ? sortDirection : "desc"
                        }
                        onClick={() => handleSort("apr_30d")}
                      >
                        APR 30d
                        <InfoOutlinedIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.5 }} />
                      </TableSortLabel>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPools.slice(0, visibleCount).map((pool) => (
                  <TableRow key={pool.pool_id} hover>
                    <TableCell>
                      {renderTokenPair(
                        pool.base_token_id,
                        pool.base_token_name,
                        pool.quote_token_id,
                        pool.quote_token_name,
                        pool.pool_type,
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {formatNumber(pool.tvl_erg, 2)} ERG{" "}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="span"
                      >
                        (${formatNumber(pool.tvl_erg * ergPrice, 0)})
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "table-cell" } }}>
                      {pool.volume_24h === 0 ? (
                        <Typography variant="body2" color="text.secondary" component="span">
                          —
                        </Typography>
                      ) : (
                        <>{formatNumber(pool.volume_24h, 2)} ERG</>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {formatFee(pool.fee_pct)}
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {formatApr(pool.apr_7d)}
                    </TableCell>
                    <TableCell align="right">
                      {formatApr(pool.apr_30d)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", alignItems: "center" }}>
                        <Tooltip title="Trade this pair">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/trade?base=${pool.base_token_id}&quote=${pool.quote_token_id}`)}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Add Liquidity">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => setAddModalPool(pool)}
                            sx={{
                              whiteSpace: "nowrap",
                              "tr:hover &": {
                                borderColor: "primary.main",
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                              },
                            }}
                          >
                            Add
                          </Button>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedPools.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 2 }}
                      >
                        No pools found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!poolsLoading && visibleCount < sortedPools.length && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
            <Button
              variant="text"
              onClick={() => setVisibleCount((c) => c + 10)}
            >
              Show More Pools
            </Button>
          </Box>
        )}
      </Paper>

      {/* Modals */}
      {addModalPool && (
        <AddLiquidityModal
          open={!!addModalPool}
          pool={addModalPool}
          userAddresses={userAddresses}
          ergPrice={ergPrice}
          icons={icons}
          onClose={() => setAddModalPool(null)}
          onSuccess={() => {
            setAddModalPool(null);
            fetchPools();
          }}
        />
      )}
      {removeModalPosition && (
        <RemoveLiquidityModal
          open={!!removeModalPosition}
          position={removeModalPosition}
          userAddresses={userAddresses}
          icons={icons}
          onClose={() => setRemoveModalPosition(null)}
          onSuccess={() => {
            setRemoveModalPosition(null);
            fetchPools();
          }}
        />
      )}
    </Box>
  );
};

export default LiquidityPage;
