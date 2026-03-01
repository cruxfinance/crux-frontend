import React, { FC, useState, useEffect, useCallback } from "react";
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

interface OrderBookProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
}

interface OrderBookLevel {
  price: number;
  amount: number;
  order_count: number;
}

interface OrderBookData {
  base_token_id: string;
  quote_token_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

const OrderBook: FC<OrderBookProps> = ({ baseToken, quoteToken }) => {
  const theme = useTheme();
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrderBook = useCallback(async () => {
    if (!baseToken) {
      setOrderBook(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        base_token_id: baseToken.tokenId,
        quote_token_id: quoteToken.tokenId,
        depth: "10",
      });

      const response = await fetch(
        `${process.env.CRUX_API}/dex/orderbook?${params}`
      );

      if (response.ok) {
        const data: OrderBookData = await response.json();
        setOrderBook(data);
      }
    } catch (error) {
      console.error("Error fetching order book:", error);
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken.tokenId]);

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 5000);
    return () => clearInterval(interval);
  }, [fetchOrderBook]);

  // Calculate max total for depth visualization (in ERG value)
  const getMaxTotal = () => {
    if (!orderBook || !baseToken) return 0;
    // Bids: amount is in quote token (nanoERG)
    const bidTotal = orderBook.bids.reduce(
      (sum, b) => sum + b.amount / Math.pow(10, quoteToken.decimals),
      0
    );
    // Asks: amount is in base token, convert to ERG value
    const askTotal = orderBook.asks.reduce(
      (sum, a) => sum + (a.amount / Math.pow(10, baseToken.decimals)) * a.price,
      0
    );
    return Math.max(bidTotal, askTotal);
  };

  const maxTotal = getMaxTotal();

  // Calculate cumulative ERG value for asks (selling base token)
  const getAskCumulativeErg = (levels: OrderBookLevel[], index: number) => {
    if (!baseToken) return 0;
    let total = 0;
    for (let i = 0; i <= index; i++) {
      total += (levels[i].amount / Math.pow(10, baseToken.decimals)) * levels[i].price;
    }
    return total;
  };

  // Calculate cumulative ERG value for bids (buying with ERG)
  const getBidCumulativeErg = (levels: OrderBookLevel[], index: number) => {
    let total = 0;
    for (let i = 0; i <= index; i++) {
      total += levels[i].amount / Math.pow(10, quoteToken.decimals);
    }
    return total;
  };

  if (!baseToken) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Select a token to view order book
        </Typography>
      </Paper>
    );
  }

  const hasOrders =
    orderBook && (orderBook.bids.length > 0 || orderBook.asks.length > 0);

  return (
    <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6">Order Book</Typography>
        {loading && <CircularProgress size={16} />}
      </Box>

      {!hasOrders ? (
        <Box
          sx={{
            height: "calc(100% - 40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No limit orders for this pair
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ height: "calc(100% - 40px)", overflow: "auto" }}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 0.5 }}>
                  Price ({quoteToken.ticker})
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  Amount ({baseToken.ticker})
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Asks (sell orders) - shown in reverse order (highest first) */}
              {orderBook?.asks
                .slice()
                .reverse()
                .map((ask, index, arr) => {
                  const originalOrder = arr.slice().reverse();
                  const originalIndex = arr.length - 1 - index;
                  const cumulative = getAskCumulativeErg(originalOrder, originalIndex);
                  const depthPercent = maxTotal > 0 ? (cumulative / maxTotal) * 100 : 0;

                  return (
                    <TableRow
                      key={`ask-${index}`}
                      sx={{
                        background: `linear-gradient(to left, ${theme.palette.error.main}22 ${depthPercent}%, transparent ${depthPercent}%)`,
                      }}
                    >
                      <TableCell
                        sx={{
                          py: 0.5,
                          color: theme.palette.error.main,
                        }}
                      >
                        {formatNumber(ask.price, 6)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        {formatNumber(ask.amount / Math.pow(10, baseToken.decimals), 4)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        {formatNumber(
                          (ask.price * ask.amount) / Math.pow(10, baseToken.decimals),
                          2
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

              {/* Spread indicator row */}
              {orderBook && orderBook.bids.length > 0 && orderBook.asks.length > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    sx={{
                      py: 1,
                      bgcolor: theme.palette.background.default,
                      textAlign: "center",
                      borderTop: `1px solid ${theme.palette.divider}`,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(orderBook.asks[0]?.price || 0, 6)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Spread:{" "}
                      {formatNumber(
                        ((orderBook.asks[0].price - orderBook.bids[0].price) /
                          orderBook.asks[0].price) *
                          100,
                        2
                      )}
                      %
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* Bids (buy orders) */}
              {orderBook?.bids.map((bid, index) => {
                const cumulative = getBidCumulativeErg(orderBook.bids, index);
                const depthPercent = maxTotal > 0 ? (cumulative / maxTotal) * 100 : 0;

                return (
                  <TableRow
                    key={`bid-${index}`}
                    sx={{
                      background: `linear-gradient(to left, ${theme.palette.success.main}22 ${depthPercent}%, transparent ${depthPercent}%)`,
                    }}
                  >
                    <TableCell
                      sx={{
                        py: 0.5,
                        color: theme.palette.success.main,
                      }}
                    >
                      {formatNumber(bid.price, 6)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      {formatNumber(bid.amount / Math.pow(10, quoteToken.decimals) / bid.price, 4)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      {formatNumber(
                        bid.amount / Math.pow(10, quoteToken.decimals),
                        2
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default OrderBook;
