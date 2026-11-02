import ErrorBoundary from "@components/ErrorBoundary";
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
import { formatNumber, formatFullNumber, normalizeTicker } from "@lib/utils/general";
import { ERG_TOKEN_ID } from "@lib/configs/paymentTokens";
import { useRouter } from "next/router";
import AddLiquidityModal from "@components/liquidity/AddLiquidityModal";
import NewClPairDialog from "@components/liquidity/NewClPairDialog";
import ClPositionRow from "@components/liquidity/ClPositionRow";
import ClWithdrawDialog from "@components/liquidity/ClWithdrawDialog";
import type { ClTokenView } from "@components/liquidity/ClWithdrawDialog";
import { useClPairs, useClPortfolio, fetchClProtocolConfig } from "@components/cl/useClData";
import type { ClProtocolConfig } from "@components/cl/useClData";
import { useClPositionActions } from "@components/cl/useClPositionActions";
import { useClStatus } from "@components/cl/useClStatus";
import { useClKeyBoxRefresh } from "@components/cl/useClKeyBoxRefresh";
import ClStatusBanner from "@components/liquidity/ClStatusBanner";
import {
  emptyClPair,
  filterMergedPairs,
  mergePoolsAndClPairs,
  pairKey,
  sortMergedPairs,
} from "@components/cl/clLiquidity";
import type { MergedPair, MergedSortField, PickedToken, VenueSplit } from "@components/cl/clLiquidity";
import { sortPositionsInRangeFirst } from "@components/cl/clFormat";
import { ERG_DECIMALS } from "@components/cl/clMath";
import type { ClPairStats, ClPortfolioPosition } from "@components/cl/clTypes";
import type { LpPosition, PoolWithApr } from "@components/liquidity/liquidityTypes";
import RemoveLiquidityModal from "@components/liquidity/RemoveLiquidityModal";

const NO_LIQUIDITY_TOOLTIP = "Liquidity for Lithos pools isn't supported on Crux yet";

const POOL_TYPE_LABELS: Record<string, string> = {
  spectrum: "Spectrum",
  dexy: "Dexy",
  lithos: "Lithos",
};

const supportsLiquidity = (poolType?: string) => poolType !== "lithos";

// A merged row can take liquidity through its CL venue even when its pool is Lithos.
const canAddToPair = (row: MergedPair) => supportsLiquidity(row.pool?.pool_type) || !!row.cl;

type SortField = MergedSortField;
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
  const [addModalPair, setAddModalPair] = useState<MergedPair | null>(null);
  const [addModalMode, setAddModalMode] = useState<"full" | "custom" | undefined>(undefined);
  const [newPairOpen, setNewPairOpen] = useState(false);
  const [withdrawCl, setWithdrawCl] = useState<ClPortfolioPosition | null>(null);
  const [protocolConfig, setProtocolConfig] = useState<ClProtocolConfig | null>(null);
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

  // Concentrated liquidity. Failures here never affect the Spectrum parts.
  const cl = useClPairs();
  const clPortfolio = useClPortfolio(userAddresses);
  const reloadCl = useCallback(() => {
    cl.reload();
    clPortfolio.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cl.reload, clPortfolio.reload]);
  const clActions = useClPositionActions(userAddresses, reloadCl);
  const clStatus = useClStatus();
  const keyRefresh = useClKeyBoxRefresh(reloadCl);

  useEffect(() => {
    let cancelled = false;
    fetchClProtocolConfig().then((c) => !cancelled && setProtocolConfig(c));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ids = new Set<string>();
    cl.pairs.forEach((p) => {
      ids.add(p.token_x);
      ids.add(p.token_y);
    });
    clPortfolio.positions.forEach((p) => {
      ids.add(p.token_x);
      ids.add(p.token_y);
    });
    if (ids.size > 0) resolveIcons([...ids]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cl.pairs, clPortfolio.positions]);

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

  // One row per token pair: Spectrum pools merged with CL pair stats.
  const mergedPairs = useMemo(
    () => mergePoolsAndClPairs(pools, cl.pairs, cl.tokens),
    [pools, cl.pairs, cl.tokens],
  );
  const sortedPairs = useMemo(
    () =>
      sortMergedPairs(
        filterMergedPairs(mergedPairs, searchQuery),
        sortField,
        sortDirection,
      ),
    [mergedPairs, searchQuery, sortField, sortDirection],
  );

  const sortedClPositions = useMemo(
    () => sortPositionsInRangeFirst(clPortfolio.positions),
    [clPortfolio.positions],
  );
  const clTokenView = useCallback(
    (id: string): ClTokenView => {
      if (id === ERG_TOKEN_ID) return { id, name: "ERG", decimals: ERG_DECIMALS };
      const m = clPortfolio.tokens[id] ?? cl.tokens[id];
      return { id, name: m?.name ?? id.slice(0, 6), decimals: m?.decimals ?? 0 };
    },
    [clPortfolio.tokens, cl.tokens],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatTokenAmount = (amount: number, decimals: number) => {
    return formatFullNumber(amount / Math.pow(10, decimals), decimals > 4 ? 4 : 2);
  };

  const renderTokenPair = (
    baseId: string,
    baseName: string,
    quoteId: string,
    quoteName: string,
    poolType?: string,
    clStats?: ClPairStats | null,
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
          label={POOL_TYPE_LABELS[poolType] ?? poolType}
          size="small"
          sx={{ height: 18, fontSize: "0.65rem" }}
        />
      )}
      {clStats && (
        <Tooltip
          title={`Concentrated liquidity: ${clStats.positions} position${clStats.positions === 1 ? "" : "s"}, ${clStats.positions_in_range} in range`}
          arrow
        >
          <Chip
            label={`CL ${clStats.positions_in_range}/${clStats.positions}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 18, fontSize: "0.65rem" }}
          />
        </Tooltip>
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

  const venueTip = (
    row: MergedPair,
    render: (v: VenueSplit, label: string) => string,
  ): React.ReactNode | undefined => {
    if (!row.spectrum || !row.clSplit) return undefined;
    return (
      <Box>
        <div>{render(row.spectrum, "Spectrum")}</div>
        <div>{render(row.clSplit, "Concentrated")}</div>
      </Box>
    );
  };
  const withTip = (tip: React.ReactNode | undefined, node: React.ReactNode) =>
    tip ? (
      <Tooltip title={tip} arrow placement="top">
        <span>{node}</span>
      </Tooltip>
    ) : (
      node
    );

  const totalTvlUsd = useMemo(
    () => mergedPairs.reduce((sum, p) => sum + (p.tvl_erg ?? 0) * ergPrice, 0),
    [mergedPairs, ergPrice],
  );

  const totalPositionsUsd = useMemo(() => {
    const spectrum = positions.reduce((sum, p) => sum + p.total_value_usd, 0);
    const clUsd = clPortfolio.positions.reduce(
      (sum, p) => sum + (p.value_usd ?? (p.value_erg ?? 0) * ergPrice),
      0,
    );
    return spectrum + clUsd;
  }, [positions, clPortfolio.positions, ergPrice]);

  const hasAnyPosition = positions.length > 0 || clPortfolio.positions.length > 0;
  const positionsBusy = positionsLoading || (clPortfolio.loading && clPortfolio.positions.length === 0);

  const openAdd = (row: MergedPair, mode?: "full" | "custom") => {
    setAddModalMode(mode);
    setAddModalPair(row);
  };

  const handleNewPair = (a: PickedToken, b: PickedToken) => {
    const key = pairKey(a.id, b.id);
    const existing = mergedPairs.find((m) => m.key === key);
    setNewPairOpen(false);
    openAdd(existing ?? emptyClPair(a, b), "custom");
    resolveIcons([a.id, b.id]);
  };

  const newPositionDisabledReason = !dAppWallet.connected
    ? "Connect a wallet to open a new position"
    : clStatus === null
      ? "Checking concentrated-liquidity status…"
      : clStatus.paused
        ? clStatus.message ?? "Concentrated liquidity is unavailable"
        : null;

  const openAddForPool = (poolId: string) => {
    const row = mergedPairs.find((m) => m.pools.some((p) => p.pool_id === poolId));
    if (row) openAdd(row);
  };

  return (
    <Box sx={{ p: upMd ? 3 : 1.5, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Liquidity
      </Typography>

      <ClStatusBanner />

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
            ${formatFullNumber(totalTvlUsd, 0)}
          </Typography>
        </Box>
        {isAuthenticated && hasAnyPosition && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Your Positions
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              ${formatFullNumber(totalPositionsUsd, 2)}
            </Typography>
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary">
            Pairs
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            {mergedPairs.length}
          </Typography>
        </Box>
      </Paper>

      {/* Your Positions */}
      {isAuthenticated && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Your Positions
          </Typography>
          {positionsBusy ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : !hasAnyPosition ? (
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
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Range</TableCell>
                    <TableCell align="right">Value (USD)</TableCell>
                    <TableCell align="right">Base</TableCell>
                    <TableCell align="right">Quote</TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                      <Tooltip title="Uncollected concentrated-liquidity fees" arrow placement="top">
                        <span>Fees</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.map((pos) => {
                    const pool = pools.find((p) => p.pool_id === pos.pool_id);
                    return (
                      <TableRow key={pos.pool_id + pos.lp_token_id}>
                        <TableCell>
                          {renderTokenPair(
                            pos.base_token.token_id,
                            normalizeTicker(pos.base_token.name),
                            pos.quote_token.token_id,
                            normalizeTicker(pos.quote_token.name),
                            pos.pool_type,
                          )}
                        </TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                          <Chip label="Full range" size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
                        </TableCell>
                        <TableCell align="right">
                          ${formatFullNumber(pos.total_value_usd, 2)}
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
                        <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                          <Typography variant="body2" color="text.secondary" component="span" sx={{ mb: 0 }}>
                            &mdash;
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}
                          >
                            {pool && (
                              <Tooltip
                                title={
                                  supportsLiquidity(pos.pool_type)
                                    ? "Add Liquidity"
                                    : NO_LIQUIDITY_TOOLTIP
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={!supportsLiquidity(pos.pool_type)}
                                    onClick={() => openAddForPool(pool.pool_id)}
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip
                              title={
                                supportsLiquidity(pos.pool_type)
                                  ? "Remove Liquidity"
                                  : NO_LIQUIDITY_TOOLTIP
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={!supportsLiquidity(pos.pool_type)}
                                  onClick={() => setRemoveModalPosition(pos)}
                                >
                                  <RemoveIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sortedClPositions.map((pos) => (
                    <ClPositionRow
                      key={pos.position_id}
                      position={pos}
                      tokenX={clTokenView(pos.token_x)}
                      tokenY={clTokenView(pos.token_y)}
                      icons={icons}
                      busy={clActions.busyId === pos.position_id}
                      onCollect={() => clActions.collect(pos.position_id)}
                      onWithdraw={() => setWithdrawCl(pos)}
                      clPaused={!!clStatus?.paused}
                      storagePeriodBlocks={clStatus?.storagePeriodBlocks}
                      keyBusy={keyRefresh.busyId === pos.position_id}
                      onRefreshKey={() => keyRefresh.refresh(pos.position_id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {clPortfolio.error && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, mb: 0 }}>
              Concentrated-liquidity positions are unavailable right now.
            </Typography>
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
          <Tooltip title={newPositionDisabledReason ?? "Open a concentrated-liquidity position for any pair"}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={!!newPositionDisabledReason}
                onClick={() => setNewPairOpen(true)}
                sx={{ whiteSpace: "nowrap" }}
              >
                New position
              </Button>
            </span>
          </Tooltip>
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
                {sortedPairs.slice(0, visibleCount).map((row) => (
                  <TableRow key={row.key} hover>
                    <TableCell>
                      {renderTokenPair(
                        row.rightId,
                        normalizeTicker(row.rightId === row.tokenX ? row.nameX : row.nameY),
                        row.leftId,
                        normalizeTicker(row.leftId === row.tokenX ? row.nameX : row.nameY),
                        row.pool?.pool_type,
                        row.cl,
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {row.tvl_erg === null ? (
                        <Typography variant="body2" color="text.secondary" component="span">
                          —
                        </Typography>
                      ) : (
                        withTip(
                          venueTip(row, (v, label) =>
                            `${label}: ${v.tvl_erg === null ? "—" : `${formatFullNumber(v.tvl_erg, 2)} ERG`}`,
                          ),
                          <>
                            {formatFullNumber(row.tvl_erg, 2)} ERG{" "}
                            <Typography variant="caption" color="text.secondary" component="span">
                              (${formatFullNumber(row.tvl_erg * ergPrice, 0)})
                            </Typography>
                          </>,
                        )
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "table-cell" } }}>
                      {row.volume_24h === 0 ? (
                        <Typography variant="body2" color="text.secondary" component="span">
                          —
                        </Typography>
                      ) : (
                        withTip(
                          venueTip(row, (v, label) => `${label}: ${formatFullNumber(v.volume_24h, 2)} ERG`),
                          <>{formatFullNumber(row.volume_24h, 2)} ERG</>,
                        )
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {row.fee_pct === null ? (
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ mb: 0 }}>
                          —
                        </Typography>
                      ) : (
                        formatFee(row.fee_pct)
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {withTip(
                        venueTip(row, (v, label) => `${label}: ${v.apr === null ? "—" : `${v.apr.toFixed(2)}%`}`),
                        formatApr(row.apr_7d),
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {withTip(
                        venueTip(row, (v, label) => `${label}: ${v.apr === null ? "—" : `${v.apr.toFixed(2)}%`}`),
                        formatApr(row.apr_30d),
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", alignItems: "center" }}>
                        <Tooltip title="Trade this pair">
                          <IconButton
                            size="small"
                            onClick={() => {
                              // Non-ERG token on the left (token=), ERG on the
                              // right (pair=), however the venues order them.
                              const pool = row.pool;
                              const isErgBase = pool
                                ? pool.base_token_id === ERG_TOKEN_ID
                                : row.tokenX === ERG_TOKEN_ID;
                              const base = pool ? pool.base_token_id : row.tokenX;
                              const quote = pool ? pool.quote_token_id : row.tokenY;
                              const tokenId = isErgBase ? quote : base;
                              const pairId = isErgBase ? base : quote;
                              router.push(`/trade?token=${tokenId}&pair=${pairId}`);
                            }}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            canAddToPair(row)
                              ? "Add Liquidity"
                              : NO_LIQUIDITY_TOOLTIP
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddIcon />}
                              disabled={!canAddToPair(row)}
                              onClick={() => openAdd(row)}
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
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedPairs.length === 0 && (
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
        {!poolsLoading && visibleCount < sortedPairs.length && (
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
      {addModalPair && (
        <AddLiquidityModal
          open={!!addModalPair}
          pair={addModalPair}
          userAddresses={userAddresses}
          walletConnected={dAppWallet.connected}
          ergPrice={ergPrice}
          icons={icons}
          protocolConfig={protocolConfig}
          initialMode={addModalMode}
          onClose={() => setAddModalPair(null)}
          onSuccess={() => {
            setAddModalPair(null);
            fetchPools();
          }}
          onClCreated={reloadCl}
        />
      )}
      <NewClPairDialog
        open={newPairOpen}
        onClose={() => setNewPairOpen(false)}
        onContinue={handleNewPair}
      />
      {withdrawCl && (
        <ClWithdrawDialog
          open={!!withdrawCl}
          position={withdrawCl}
          tokenX={clTokenView(withdrawCl.token_x)}
          tokenY={clTokenView(withdrawCl.token_y)}
          icons={icons}
          busy={clActions.busyId === withdrawCl.position_id}
          onClose={() => setWithdrawCl(null)}
          onConfirm={async () => {
            const ok = await clActions.withdraw(withdrawCl.position_id);
            if (ok) setWithdrawCl(null);
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

export default function LiquidityPageWithBoundary() {
  return (
    <ErrorBoundary>
      <LiquidityPage />
    </ErrorBoundary>
  );
}
