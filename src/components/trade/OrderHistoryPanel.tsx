import React, { FC, useState, useEffect, useCallback, useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Skeleton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useWallet } from "@contexts/WalletContext";
import { useAlert } from "@contexts/AlertContext";
import { formatNumber, formatFullNumber, normalizeTicker } from "@lib/utils/general";
import { copyToClipboard } from "@lib/utils/clipboard";
import { ERG_TOKEN_ID } from "@lib/configs/paymentTokens";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface TokenInfo {
  tokenId: string;
  name: string;
  ticker: string;
  icon: string;
  decimals: number;
  price: number;
}

interface OrderHistoryPanelProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
  onCountChange?: (count: number) => void;
  userAddresses: string[];
}

interface LimitOrder {
  id: number;
  order_id: string;
  current_box_id: number | null;
  owner_address: string;
  given_token_id: string | null;
  given_token_name: string | null;
  given_token_decimals: number | null;
  taken_token_id: string | null;
  taken_token_name: string | null;
  taken_token_decimals: number | null;
  original_given_amount: number;
  remaining_given_amount: number;
  price_numerator: number;
  price_denominator: number;
  min_fill_amount: number;
  expiry_height: number | null;
  executor_fee: number;
  status: string;
  created_height: number;
  created_at: number;
  updated_at: number;
  created_tx_hash?: string;
  is_mempool?: boolean;
}

type StatusFilter = "all" | "filled" | "cancelled";
type SortField = "date" | "price" | "amount" | "filled" | "total";
type SortDirection = "asc" | "desc";

const FETCH_LIMIT = 50;

const OrderHistoryPanel: FC<OrderHistoryPanelProps> = ({
  baseToken,
  quoteToken,
  onCountChange,
  userAddresses,
}) => {
  const theme = useTheme();
  const { dAppWallet } = useWallet();
  const { addAlert } = useAlert();

  const [allOrders, setAllOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [currentPairOnly, setCurrentPairOnly] = useState(false);

  // Always fetch all statuses, filter client-side for counts
  const fetchOrders = useCallback(
    async (appendOffset = 0) => {
      if (userAddresses.length === 0) {
        setAllOrders([]);
        return;
      }

      setLoading(true);
      try {
        const fetched: LimitOrder[] = [];

        for (const address of userAddresses.slice(0, 5)) {
          const params = new URLSearchParams({
            owner_address: address,
            status: "filled,cancelled,expired",
            limit: String(FETCH_LIMIT),
            offset: String(appendOffset),
          });

          const response = await fetch(
            `${process.env.CRUX_API}/dex/orders?${params}`,
          );

          if (response.ok) {
            const result = await response.json();
            if (Array.isArray(result)) {
              fetched.push(...result);
            }
          }
        }

        // Remove duplicates
        const uniqueFetched = fetched.filter(
          (order, index, self) =>
            index === self.findIndex((o) => o.order_id === order.order_id),
        );

        if (appendOffset === 0) {
          setAllOrders(uniqueFetched);
        } else {
          setAllOrders((prev) => {
            const combined = [...prev, ...uniqueFetched];
            return combined.filter(
              (order, index, self) =>
                index === self.findIndex((o) => o.order_id === order.order_id),
            );
          });
        }

        setHasMore(uniqueFetched.length >= FETCH_LIMIT);
      } catch (error) {
        console.error("Error fetching order history:", error);
      } finally {
        setInitialLoading(false);
        setLoading(false);
      }
    },
    [userAddresses],
  );

  useEffect(() => {
    setOffset(0);
    fetchOrders(0);
  }, [fetchOrders]);

  // Notify parent of count changes
  useEffect(() => {
    if (onCountChange) {
      onCountChange(allOrders.length);
    }
  }, [allOrders.length, onCountChange]);

  const handleLoadMore = () => {
    const newOffset = offset + FETCH_LIMIT;
    setOffset(newOffset);
    fetchOrders(newOffset);
  };

  // --- Filter counts ---
  const filterCounts = useMemo(() => {
    let filled = 0;
    let cancelledExpired = 0;
    for (const o of allOrders) {
      const s = o.status.toLowerCase();
      if (s === "filled") filled++;
      else if (s === "cancelled" || s === "expired") cancelledExpired++;
    }
    return { all: allOrders.length, filled, cancelledExpired };
  }, [allOrders]);

  // --- Helpers (must be declared before useMemo hooks that use them) ---
  const getOrderSide = (order: LimitOrder): "buy" | "sell" => {
    const givenIsQuote =
      order.given_token_id === null ||
      order.given_token_id === quoteToken.tokenId;
    return givenIsQuote ? "buy" : "sell";
  };

  const getPairDisplay = (order: LimitOrder, side: "buy" | "sell"): string => {
    if (side === "buy") {
      return `${normalizeTicker(order.taken_token_name || "token")}/${normalizeTicker(order.given_token_name || "ERG")}`;
    }
    return `${normalizeTicker(order.given_token_name || "token")}/${normalizeTicker(order.taken_token_name || "ERG")}`;
  };

  const getPrice = (order: LimitOrder, side: "buy" | "sell"): number => {
    if (order.price_denominator === 0) return 0;
    const rawPrice = order.price_numerator / order.price_denominator;
    const givenDecimals = order.given_token_decimals ?? 9;
    const takenDecimals = order.taken_token_decimals ?? 9;
    const decimalAdjustment = Math.pow(10, givenDecimals - takenDecimals);
    const adjustedPrice = rawPrice * decimalAdjustment;
    return side === "buy" ? 1 / adjustedPrice : adjustedPrice;
  };

  const getBaseAmount = (order: LimitOrder, side: "buy" | "sell"): number => {
    const givenDecimals = order.given_token_decimals ?? 9;
    const givenAmount =
      order.original_given_amount / Math.pow(10, givenDecimals);

    if (side === "sell") {
      return givenAmount;
    }
    const price = getPrice(order, side);
    if (price === 0) return 0;
    return givenAmount / price;
  };

  const getTotal = (
    order: LimitOrder,
    side: "buy" | "sell",
    price: number,
    baseAmount: number,
  ): number => {
    return price * baseAmount;
  };

  const getFilledPercent = (order: LimitOrder): number => {
    if (order.original_given_amount === 0) return 0;
    const filled = order.original_given_amount - order.remaining_given_amount;
    return Math.min(100, Math.max(0, (filled / order.original_given_amount) * 100));
  };

  // --- Client-side filter ---
  const filteredOrders = useMemo(() => {
    let result = allOrders;

    if (statusFilter === "filled") {
      result = result.filter((o) => o.status.toLowerCase() === "filled");
    } else if (statusFilter === "cancelled") {
      result = result.filter((o) => {
        const s = o.status.toLowerCase();
        return s === "cancelled" || s === "expired";
      });
    }

    if (currentPairOnly && baseToken) {
      result = result.filter((o) => {
        const side = getOrderSide(o);
        const baseId = side === "buy" ? o.taken_token_id : o.given_token_id;
        const quoteId = side === "buy" ? o.given_token_id : o.taken_token_id;
        const matchesBase = baseId === baseToken.tokenId;
        const matchesQuote = quoteId === quoteToken.tokenId || quoteId === null || quoteId === ERG_TOKEN_ID;
        return matchesBase && matchesQuote;
      });
    }

    return result;
  }, [allOrders, statusFilter, currentPairOnly, baseToken, quoteToken]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Today ${time}`;
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    }) + ` ${time}`;
  };

  const formatFullTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // --- Sort ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const sideA = getOrderSide(a);
      const sideB = getOrderSide(b);
      let aVal: number, bVal: number;

      switch (sortField) {
        case "date":
          aVal = a.created_at;
          bVal = b.created_at;
          break;
        case "price":
          aVal = getPrice(a, sideA);
          bVal = getPrice(b, sideB);
          break;
        case "amount":
          aVal = getBaseAmount(a, sideA);
          bVal = getBaseAmount(b, sideB);
          break;
        case "filled":
          aVal = getFilledPercent(a);
          bVal = getFilledPercent(b);
          break;
        case "total": {
          const priceA = getPrice(a, sideA);
          const priceB = getPrice(b, sideB);
          aVal = getTotal(a, sideA, priceA, getBaseAmount(a, sideA));
          bVal = getTotal(b, sideB, priceB, getBaseAmount(b, sideB));
          break;
        }
        default:
          aVal = a.created_at;
          bVal = b.created_at;
      }

      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [filteredOrders, sortField, sortDirection]);

  // --- Status helpers ---
  const getStatusColor = (
    status: string,
  ): "success" | "error" | "warning" | "default" | "info" => {
    switch (status.toLowerCase()) {
      case "filled":
        return "success";
      case "cancelled":
        return "error";
      case "expired":
        return "warning";
      case "pending_fill":
      case "pending_partial_fill":
        return "info";
      case "pending_cancel":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending_fill":
      case "pending_partial_fill":
        return "Filling...";
      case "pending_cancel":
        return "Cancelling...";
      default:
        return status;
    }
  };

  // --- Token icon helper ---
  const getBaseTokenIcon = (order: LimitOrder, side: "buy" | "sell") => {
    if (side === "buy") {
      // Base is the taken token
      return order.taken_token_name || "?";
    }
    return order.given_token_name || "?";
  };

  const getQuoteTokenIcon = (order: LimitOrder, side: "buy" | "sell") => {
    if (side === "buy") {
      return order.given_token_name || "ERG";
    }
    return order.taken_token_name || "ERG";
  };

  const TokenAvatar: FC<{ token: TokenInfo | null; fallback: string }> = ({
    token,
    fallback,
  }) => (
    <Avatar
      src={token?.icon || ""}
      sx={{
        width: 14,
        height: 14,
        fontSize: "0.5rem",
        bgcolor: "rgba(255,255,255,0.1)",
      }}
    >
      {fallback[0]?.toUpperCase() || "?"}
    </Avatar>
  );

  // --- Header cell style ---
  const headerCellSx = {
    py: 0.5,
    whiteSpace: "nowrap" as const,
    backgroundColor: theme.palette.background.paper,
  };

  // --- Render ---
  if (!dAppWallet.connected) {
    return (
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 150,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Connect wallet to view order history
        </Typography>
      </Box>
    );
  }

  const handleStatusFilterChange = (
    _: React.MouseEvent<HTMLElement>,
    newFilter: StatusFilter | null,
  ) => {
    if (newFilter) {
      setStatusFilter(newFilter);
    }
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        {Array.from({ length: 8 }).map((_, j) => (
          <TableCell key={j} sx={{ py: 0.5 }}>
            <Skeleton variant="text" width={j === 0 ? 90 : j === 1 ? 80 : 60} />
          </TableCell>
        ))}
      </TableRow>
    ));

  const renderFilledCell = (filledPercent: number) => {
    if (filledPercent === 0) {
      return (
        <Typography variant="caption" color="text.secondary">
          0%
        </Typography>
      );
    }
    if (filledPercent >= 100) {
      return (
        <Typography variant="caption" color="success.main" fontWeight={500}>
          100%
        </Typography>
      );
    }
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
        <Box sx={{ width: 50 }}>
          <LinearProgress
            variant="determinate"
            value={filledPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.08)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 3,
              },
            }}
          />
        </Box>
        <Typography variant="caption" color="primary">
          {filledPercent.toFixed(0)}%
        </Typography>
      </Box>
    );
  };

  // Determine which token avatars to show for each order
  // Orders may span different pairs, so we match against props when possible
  const getTokenForAvatar = (
    order: LimitOrder,
    side: "buy" | "sell",
    which: "base" | "quote",
  ): { token: TokenInfo | null; fallback: string } => {
    if (which === "base") {
      const name = side === "buy" ? order.taken_token_name : order.given_token_name;
      const id = side === "buy" ? order.taken_token_id : order.given_token_id;
      // Match against props
      if (baseToken && id === baseToken.tokenId) return { token: baseToken, fallback: baseToken.ticker };
      if (id === quoteToken.tokenId) return { token: quoteToken, fallback: quoteToken.ticker };
      return { token: null, fallback: name || "?" };
    }
    // quote
    const name = side === "buy" ? order.given_token_name : order.taken_token_name;
    const id = side === "buy" ? order.given_token_id : order.taken_token_id;
    if (id === quoteToken.tokenId || id === null || id === ERG_TOKEN_ID)
      return { token: quoteToken, fallback: quoteToken.ticker };
    if (baseToken && id === baseToken.tokenId) return { token: baseToken, fallback: baseToken.ticker };
    return { token: null, fallback: name || "?" };
  };

  return (
      <Box>
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
          {loading && !initialLoading && (
            <CircularProgress size={18} />
          )}
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {baseToken && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentPairOnly}
                  onChange={(e) => setCurrentPairOnly(e.target.checked)}
                  size="small"
                  sx={{ py: 0.3 }}
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  {baseToken.ticker}/{quoteToken.ticker} only
                </Typography>
              }
              sx={{ mr: 0 }}
            />
          )}
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleStatusFilterChange}
            size="small"
          >
            <ToggleButton value="all">All ({filterCounts.all})</ToggleButton>
            <ToggleButton value="filled">
              Filled ({filterCounts.filled})
            </ToggleButton>
            <ToggleButton value="cancelled">
              Cancelled / Expired ({filterCounts.cancelledExpired})
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {initialLoading ? (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Date</TableCell>
                <TableCell sx={headerCellSx}>Pair</TableCell>
                <TableCell sx={headerCellSx}>Side</TableCell>
                <TableCell sx={headerCellSx} align="right">Price</TableCell>
                <TableCell sx={headerCellSx} align="right">Amount</TableCell>
                <TableCell sx={headerCellSx} align="right">Total</TableCell>
                <TableCell sx={headerCellSx} align="right">Filled</TableCell>
                <TableCell sx={headerCellSx} align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{renderSkeletonRows()}</TableBody>
          </Table>
        </TableContainer>
      ) : sortedOrders.length === 0 ? (
        <Box
          sx={{
            py: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ShowChartIcon sx={{ fontSize: 40, opacity: 0.3, color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary">
            No order history found
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerCellSx, width: 120 }}>
                    <TableSortLabel
                      active={sortField === "date"}
                      direction={sortField === "date" ? sortDirection : "desc"}
                      onClick={() => handleSort("date")}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 100 }}>Pair</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 50 }}>Side</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 110 }} align="right">
                    <TableSortLabel
                      active={sortField === "price"}
                      direction={sortField === "price" ? sortDirection : "desc"}
                      onClick={() => handleSort("price")}
                    >
                      Price
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 110 }} align="right">
                    <TableSortLabel
                      active={sortField === "amount"}
                      direction={sortField === "amount" ? sortDirection : "desc"}
                      onClick={() => handleSort("amount")}
                    >
                      Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 110 }} align="right">
                    <TableSortLabel
                      active={sortField === "total"}
                      direction={sortField === "total" ? sortDirection : "desc"}
                      onClick={() => handleSort("total")}
                    >
                      Total
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 90 }} align="right">
                    <TableSortLabel
                      active={sortField === "filled"}
                      direction={sortField === "filled" ? sortDirection : "desc"}
                      onClick={() => handleSort("filled")}
                    >
                      Filled
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 80 }} align="center">
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedOrders.map((order) => {
                  const side = getOrderSide(order);
                  const price = getPrice(order, side);
                  const baseAmount = getBaseAmount(order, side);
                  const total = getTotal(order, side, price, baseAmount);
                  const filledPercent = getFilledPercent(order);
                  const isPending = order.status.startsWith("pending_");
                  const baseTokenInfo = getTokenForAvatar(order, side, "base");
                  const quoteTokenInfo = getTokenForAvatar(order, side, "quote");

                  const tooltipContent = [
                    `Created: ${formatFullTime(order.created_at)}`,
                    order.updated_at !== order.created_at
                      ? `Closed: ${formatFullTime(order.updated_at)}`
                      : null,
                    `Order ID: ${order.order_id.slice(0, 16)}...`,
                  ]
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <Tooltip
                      key={order.order_id}
                      title={
                        <Box sx={{ whiteSpace: "pre-line", fontSize: "0.75rem" }}>
                          {tooltipContent}
                        </Box>
                      }
                      placement="left"
                      enterDelay={400}
                      arrow
                    >
                      <TableRow
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: theme.palette.background.hover || "rgba(255,255,255,0.03)",
                          },
                          ...(isPending && {
                            opacity: 0.7,
                            borderLeft: `3px dashed ${theme.palette.warning.main}`,
                          }),
                        }}
                        onClick={() => {
                          const url = order.created_tx_hash
                            ? `https://sigmaspace.io/en/transaction/${order.created_tx_hash}`
                            : `https://sigmaspace.io/en/address/${order.owner_address}`;
                          window.open(url, "_blank");
                        }}
                      >
                        {/* Date - created_at */}
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="caption">
                            {formatTime(order.created_at)}
                          </Typography>
                        </TableCell>

                        {/* Pair - normalized BASE/QUOTE */}
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem" }}>
                            {getPairDisplay(order, side)}
                          </Typography>
                        </TableCell>

                        {/* Side - colored text, no chip */}
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color:
                                side === "buy"
                                  ? theme.palette.up.main
                                  : theme.palette.down.main,
                            }}
                          >
                            {side.toUpperCase()}
                          </Typography>
                        </TableCell>

                        {/* Price with quote token avatar */}
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 0.5,
                            }}
                          >
                            <Typography variant="caption">
                              {formatFullNumber(price, 6)}
                            </Typography>
                            <TokenAvatar
                              token={quoteTokenInfo.token}
                              fallback={quoteTokenInfo.fallback}
                            />
                          </Box>
                        </TableCell>

                        {/* Amount with base token avatar */}
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 0.5,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem" }}>
                              {formatFullNumber(baseAmount, 4)}
                            </Typography>
                            <TokenAvatar
                              token={baseTokenInfo.token}
                              fallback={baseTokenInfo.fallback}
                            />
                          </Box>
                        </TableCell>

                        {/* Total with quote token avatar */}
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 0.5,
                            }}
                          >
                            <Typography variant="caption">
                              {formatFullNumber(total, 4)}
                            </Typography>
                            <TokenAvatar
                              token={quoteTokenInfo.token}
                              fallback={quoteTokenInfo.fallback}
                            />
                          </Box>
                        </TableCell>

                        {/* Filled - progress bar */}
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          {renderFilledCell(filledPercent)}
                        </TableCell>

                        {/* Status - outlined chip (filled for pending) + copy order ID */}
                        <TableCell align="center" sx={{ py: 0.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
                            <Chip
                              label={getStatusLabel(order.status)}
                              size="small"
                              color={getStatusColor(order.status)}
                              variant={isPending ? "filled" : "outlined"}
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                            <Tooltip title="Copy Order ID">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(order.order_id);
                                  addAlert("success", "Order ID copied");
                                }}
                                sx={{ p: 0.25 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    </Tooltip>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {hasMore && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
              <Button
                size="small"
                onClick={handleLoadMore}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                {loading ? "Loading..." : "Load more"}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default OrderHistoryPanel;
