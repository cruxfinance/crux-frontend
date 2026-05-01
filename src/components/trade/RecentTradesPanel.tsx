import React, { FC, useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Avatar,
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { formatNumber, formatFullNumber } from "@lib/utils/general";

interface TokenInfo {
  tokenId: string;
  name: string;
  ticker: string;
  icon: string;
  decimals: number;
  price: number;
}

interface RecentTradesPanelProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
  ergPrice: number;
  onTradeClick?: (price: number) => void;
}

interface Trade {
  id: number;
  timestamp: number;
  side: "buy" | "sell";
  price: number;
  amount: number;
  total: number;
}

type SortField = "timestamp" | "price" | "amount" | "total";
type SortDirection = "asc" | "desc";

const RecentTradesPanel: FC<RecentTradesPanelProps> = ({
  baseToken,
  quoteToken,
  ergPrice,
  onTradeClick,
}) => {
  const theme = useTheme();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Force re-render every 5s so "Updated Xs ago" stays current
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial trades using /dex/order_history
  const fetchTrades = useCallback(async () => {
    if (!baseToken) {
      setTrades([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        token_id: baseToken.tokenId,
        base_token_id: quoteToken.tokenId,
        offset: "0",
        limit: "50",
      });

      const response = await fetch(
        `${process.env.CRUX_API}/dex/order_history?${params}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data: DexOrder[] = await response.json();

      const formattedTrades: Trade[] = data
        .filter(
          (order) =>
            order.status === "Filled" || order.status === "Partially Filled",
        )
        .map((order) => {
          const isBuy = order.order_type.toLowerCase().includes("buy");
          const filledQuote = parseFloat(order.filled_quote_amount);
          const filledBase = parseFloat(order.filled_base_amount);

          return {
            id: order.id,
            timestamp: order.chain_time,
            side: isBuy ? "buy" : "sell",
            price: order.price,
            amount: filledQuote,
            total: filledBase,
          };
        });

      setTrades(formattedTrades);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error("Error fetching trades:", error);
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken]);

  // Initial fetch and polling
  useEffect(() => {
    fetchTrades();

    // Poll for new trades every 10 seconds
    const interval = setInterval(fetchTrades, 10000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  // Try to connect to WebSocket for real-time updates
  useEffect(() => {
    if (!baseToken) return;

    const wsUrl = process.env.CRUX_API?.replace("http", "ws");
    if (!wsUrl) return;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(
          `${wsUrl}/dex/order_history/ws?token_id=${baseToken.tokenId}&base_token_id=${quoteToken.tokenId}&offset=0&limit=50`,
        );

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const orders: DexOrder[] = JSON.parse(event.data);
            const formattedTrades: Trade[] = orders
              .filter(
                (order) =>
                  order.status === "Filled" ||
                  order.status === "Partially Filled",
              )
              .map((order) => {
                const isBuy = order.order_type.toLowerCase().includes("buy");
                const filledQuote = parseFloat(order.filled_quote_amount);
                const filledBase = parseFloat(order.filled_base_amount);

                return {
                  id: order.id,
                  timestamp: order.chain_time,
                  side: isBuy ? "buy" : "sell",
                  price: order.price,
                  amount: filledQuote,
                  total: filledBase,
                };
              });

            setTrades(formattedTrades);
            setLastUpdateTime(Date.now());
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws.close();
        };

        wsRef.current = ws;
      } catch {
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
    };
  }, [baseToken, quoteToken]);

  const formatDateTime = (timestamp: number): string => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (isToday) {
      return `Today ${time}`;
    }

    const date = d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return `${date} ${time}`;
  };

  const formatFullDateTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredTrades =
    filter === "all" ? trades : trades.filter((t) => t.side === filter);

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [filteredTrades, sortField, sortDirection]);

  const updateStatusText = useMemo(() => {
    if (wsConnected) return null;
    if (!lastUpdateTime) return null;
    const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    return `Updated ${Math.floor(seconds / 60)}m ago`;
  }, [wsConnected, lastUpdateTime]);

  const headerCellSx = {
    py: 0.5,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "text.secondary",
    borderBottom: `1px solid ${theme.palette.divider}`,
    whiteSpace: "nowrap" as const,
  };

  if (!baseToken) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          height: 360,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Select a token to view recent trades
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, height: 360, display: "flex", flexDirection: "column", transition: 'border-color 0.2s', '&:hover': { borderColor: 'rgba(254,107,139,0.35)' } }}>
      {/* Header: title + live indicator + filter */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>Recent Trades</Typography>
          {loading && <CircularProgress size={20} />}
          {wsConnected ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <FiberManualRecordIcon
                sx={{
                  fontSize: 8,
                  color: theme.palette.success.main,
                  "@keyframes pulse": {
                    "0%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                    "100%": { opacity: 1 },
                  },
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                Live
              </Typography>
            </Box>
          ) : updateStatusText ? (
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
              {updateStatusText}
            </Typography>
          ) : null}
        </Box>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, val) => val && setFilter(val)}
          size="small"
          sx={{
            height: 24,
            "& .MuiToggleButton-root": {
              px: 1,
              py: 0,
              fontSize: "0.7rem",
              textTransform: "none",
              lineHeight: 1,
              border: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton
            value="buy"
            sx={{
              "&.Mui-selected": {
                color: theme.palette.success.main,
                bgcolor: `${theme.palette.success.main}15`,
              },
            }}
          >
            Buy
          </ToggleButton>
          <ToggleButton
            value="sell"
            sx={{
              "&.Mui-selected": {
                color: theme.palette.error.main,
                bgcolor: `${theme.palette.error.main}15`,
              },
            }}
          >
            Sell
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Table */}
      <TableContainer sx={{ flex: 1, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, width: 130 }}>
                <TableSortLabel
                  active={sortField === "timestamp"}
                  direction={sortField === "timestamp" ? sortDirection : "desc"}
                  onClick={() => handleSort("timestamp")}
                >
                  Time
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerCellSx, width: 110 }} align="right">
                <TableSortLabel
                  active={sortField === "price"}
                  direction={sortField === "price" ? sortDirection : "desc"}
                  onClick={() => handleSort("price")}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerCellSx, width: 100 }} align="right">
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
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTrades.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, border: "none" }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    <ShowChartIcon sx={{ fontSize: 40, opacity: 0.3, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      No recent trades
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              sortedTrades.map((trade) => {
                const sideColor =
                  trade.side === "buy"
                    ? theme.palette.success.main
                    : theme.palette.error.main;

                return (
                  <Tooltip
                    key={trade.id}
                    placement="left"
                    arrow
                    enterDelay={400}
                    title={
                      <Box>
                        <Typography variant="caption" display="block">
                          {formatFullDateTime(trade.timestamp)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Type: {trade.side === "buy" ? "Buy" : "Sell"}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Price: {formatFullNumber(trade.price, 6)} {quoteToken.ticker}
                        </Typography>
                      </Box>
                    }
                  >
                    <TableRow
                      onClick={() => onTradeClick?.(trade.price)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${trade.side} trade at ${trade.price}, click to use price`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onTradeClick?.(trade.price);
                        }
                      }}
                      sx={{
                        cursor: onTradeClick ? "pointer" : "default",
                        "&:hover": {
                          bgcolor: `${sideColor}08`,
                          borderLeft: `2px solid ${sideColor}`,
                        },
                        borderLeft: "2px solid transparent",
                        transition: "background-color 0.15s, border-color 0.15s",
                      }}
                    >
                      {/* Time: side arrow + inline date & time */}
                      <TableCell sx={{ py: 0.75, pr: 0.5, whiteSpace: "nowrap", width: 130 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {trade.side === "buy" ? (
                            <ArrowUpwardIcon
                              sx={{ fontSize: 12, color: theme.palette.success.main }}
                              aria-label="Buy"
                            />
                          ) : (
                            <ArrowDownwardIcon
                              sx={{ fontSize: 12, color: theme.palette.error.main }}
                              aria-label="Sell"
                            />
                          )}
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", fontSize: "0.7rem" }}
                          >
                            {formatDateTime(trade.timestamp)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Price: value + quoteToken logo */}
                      <TableCell align="right" sx={{ py: 0.75, whiteSpace: "nowrap", width: 110 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                          <Typography
                            sx={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              color: sideColor,
                            }}
                          >
                            {formatFullNumber(trade.price, 6)}
                          </Typography>
                          <Avatar
                            src={quoteToken.icon || undefined}
                            sx={{ width: 14, height: 14, fontSize: "0.5rem" }}
                          >
                            {quoteToken.ticker?.[0]}
                          </Avatar>
                        </Box>
                      </TableCell>

                      {/* Amount: value + baseToken logo */}
                      <TableCell align="right" sx={{ py: 0.75, whiteSpace: "nowrap", width: 100 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                            {formatFullNumber(trade.amount, 4)}
                          </Typography>
                          <Avatar
                            src={baseToken.icon || undefined}
                            sx={{ width: 14, height: 14, fontSize: "0.5rem" }}
                          >
                            {baseToken.ticker?.[0]}
                          </Avatar>
                        </Box>
                      </TableCell>

                      {/* Total: value + quoteToken logo */}
                      <TableCell align="right" sx={{ py: 0.75, whiteSpace: "nowrap", width: 110 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                            {formatFullNumber(trade.total, 4)}
                          </Typography>
                          <Avatar
                            src={quoteToken.icon || undefined}
                            sx={{ width: 14, height: 14, fontSize: "0.5rem" }}
                          >
                            {quoteToken.ticker?.[0]}
                          </Avatar>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </Tooltip>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentTradesPanel;
