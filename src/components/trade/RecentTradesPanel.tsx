import React, { FC, useState, useEffect, useCallback, useRef } from "react";
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
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { formatNumber } from "@lib/utils/general";

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
}

interface Trade {
  id: number;
  timestamp: number;
  side: "buy" | "sell";
  price: number;
  amount: number;
  total: number;
}


const RecentTradesPanel: FC<RecentTradesPanelProps> = ({
  baseToken,
  quoteToken,
  ergPrice,
}) => {
  const theme = useTheme();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

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
    } catch (error) {
      console.error("Error fetching trades:", error);
    } finally {
      setLoading(false);
    }
  }, [baseToken]);

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
          `${wsUrl}/dex/order_history/ws?token_id=${baseToken.tokenId}&offset=0&limit=50`,
        );

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
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        ws.onerror = () => {
          // WebSocket not available, fall back to polling
          ws.close();
        };

        wsRef.current = ws;
      } catch {
        // WebSocket connection failed, polling will handle updates
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [baseToken]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!baseToken) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          height: 300,
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
    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6">Recent Trades</Typography>
        {loading && <CircularProgress size={16} />}
      </Box>

      <TableContainer sx={{ maxHeight: 240 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 0.5 }}>Time</TableCell>
              <TableCell sx={{ py: 0.5 }} align="right">
                Price
              </TableCell>
              <TableCell sx={{ py: 0.5 }} align="right">
                Amount
              </TableCell>
              <TableCell sx={{ py: 0.5 }} align="right">
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No recent trades
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade) => (
                <TableRow
                  key={trade.id}
                  sx={{
                    "&:hover": { bgcolor: theme.palette.action.hover },
                  }}
                >
                  <TableCell sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      {formatTime(trade.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      py: 0.5,
                      color:
                        trade.side === "buy"
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                    }}
                  >
                    <Typography variant="caption">
                      {formatNumber(trade.price, 6)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      {formatNumber(trade.amount, 4)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      {formatNumber(trade.total, 4)} {quoteToken.ticker}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentTradesPanel;
