import React, { FC, useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Tooltip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { formatNumber, formatFullNumber } from "@lib/utils/general";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

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
  onPriceClick?: (price: number, amount?: number) => void;
}

interface OrderBookLevel {
  price: number;
  amount: number;
  order_count: number;
}

interface VirtualOrderBookLevel {
  price: number;
  amount: number;
  total: number;
  cumulative_amount: number;
  cumulative_total: number;
}

interface OrderBookData {
  base_token_id: string;
  quote_token_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  virtual_bids?: VirtualOrderBookLevel[];
  virtual_asks?: VirtualOrderBookLevel[];
  pool_mid_price?: number;
}

/** Merged row for display — real orders, virtual AMM levels, or both at the same price */
interface MergedRow {
  price: number;
  /** Base token amount (raw) from real orders */
  realAmount: number;
  /** Base token amount (raw) from virtual AMM */
  virtualAmount: number;
  orderCount: number;
  /** Cumulative ERG value up to this row (for depth bar) */
  cumulativeErg: number;
  isVirtual: boolean;
  isReal: boolean;
}

const OrderBook: FC<OrderBookProps> = ({ baseToken, quoteToken, onPriceClick }) => {
  const theme = useTheme();
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVirtual, setShowVirtual] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [viewMode, setViewMode] = useState<"buy" | "sell" | "both">("both");
  const lastFetchRef = useRef<number>(Date.now());
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

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
        depth: viewModeRef.current === "both" ? "10" : "20",
      });

      const response = await fetch(
        `${process.env.CRUX_API}/dex/orderbook?${params}`
      );

      if (response.ok) {
        const data: OrderBookData = await response.json();
        setOrderBook(data);
        lastFetchRef.current = Date.now();
        setIsStale(false);
      }
    } catch (error) {
      console.error("Error fetching order book:", error);
      // Mark stale if last success was >10s ago
      if (Date.now() - lastFetchRef.current > 10000) {
        setIsStale(true);
      }
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken.tokenId]);

  useEffect(() => {
    fetchOrderBook();
    setViewMode("both");
    const interval = setInterval(fetchOrderBook, 5000);
    return () => clearInterval(interval);
  }, [fetchOrderBook]);

  // Merge real and virtual levels into unified rows
  const { mergedAsks, mergedBids, maxCumulativeErg } = useMemo(() => {
    if (!orderBook || !baseToken) {
      return { mergedAsks: [], mergedBids: [], maxCumulativeErg: 0 };
    }

    const baseDec = Math.pow(10, baseToken.decimals);
    const quoteDec = Math.pow(10, quoteToken.decimals);

    // === ASKS ===
    // Real asks: amount is in base token raw units
    const askMap = new Map<number, MergedRow>();

    for (const ask of orderBook.asks) {
      const key = Math.round(ask.price * 1e8); // group by price
      const existing = askMap.get(key);
      if (existing) {
        existing.realAmount += ask.amount;
        existing.orderCount += ask.order_count;
        existing.isReal = true;
      } else {
        askMap.set(key, {
          price: ask.price,
          realAmount: ask.amount,
          virtualAmount: 0,
          orderCount: ask.order_count,
          cumulativeErg: 0,
          isVirtual: false,
          isReal: true,
        });
      }
    }

    if (showVirtual && orderBook.virtual_asks) {
      for (const va of orderBook.virtual_asks) {
        const key = Math.round(va.price * 1e8);
        const existing = askMap.get(key);
        if (existing) {
          existing.virtualAmount += va.amount;
          existing.isVirtual = true;
        } else {
          askMap.set(key, {
            price: va.price,
            realAmount: 0,
            virtualAmount: va.amount,
            orderCount: 0,
            cumulativeErg: 0,
            isVirtual: true,
            isReal: false,
          });
        }
      }
    }

    // Sort asks ascending by price, compute cumulative
    const sortedAsks = Array.from(askMap.values()).sort((a, b) => a.price - b.price);
    let cumErg = 0;
    for (const row of sortedAsks) {
      const totalAmount = row.realAmount + row.virtualAmount;
      cumErg += (totalAmount / baseDec) * row.price;
      row.cumulativeErg = cumErg;
    }

    // === BIDS ===
    const bidMap = new Map<number, MergedRow>();

    for (const bid of orderBook.bids) {
      const key = Math.round(bid.price * 1e8);
      // Bid amount is in quote token (ERG), convert to base amount for display
      const baseAmount = bid.amount; // raw quote units
      const existing = bidMap.get(key);
      if (existing) {
        existing.realAmount += baseAmount;
        existing.orderCount += bid.order_count;
        existing.isReal = true;
      } else {
        bidMap.set(key, {
          price: bid.price,
          realAmount: baseAmount,
          virtualAmount: 0,
          orderCount: bid.order_count,
          cumulativeErg: 0,
          isVirtual: false,
          isReal: true,
        });
      }
    }

    if (showVirtual && orderBook.virtual_bids) {
      for (const vb of orderBook.virtual_bids) {
        const key = Math.round(vb.price * 1e8);
        const existing = bidMap.get(key);
        if (existing) {
          existing.virtualAmount += vb.amount;
          existing.isVirtual = true;
        } else {
          bidMap.set(key, {
            price: vb.price,
            realAmount: 0,
            virtualAmount: vb.amount,
            orderCount: 0,
            cumulativeErg: 0,
            isVirtual: true,
            isReal: false,
          });
        }
      }
    }

    // Sort bids descending by price, compute cumulative
    const sortedBids = Array.from(bidMap.values()).sort((a, b) => b.price - a.price);
    cumErg = 0;
    for (const row of sortedBids) {
      // For bids: real amount is in quote token raw units
      const realErg = row.realAmount / quoteDec;
      const virtualErg = (row.virtualAmount / baseDec) * row.price;
      cumErg += realErg + virtualErg;
      row.cumulativeErg = cumErg;
    }

    const maxAsk = sortedAsks.length > 0 ? sortedAsks[sortedAsks.length - 1].cumulativeErg : 0;
    const maxBid = sortedBids.length > 0 ? sortedBids[sortedBids.length - 1].cumulativeErg : 0;

    return {
      mergedAsks: sortedAsks,
      mergedBids: sortedBids,
      maxCumulativeErg: Math.max(maxAsk, maxBid),
    };
  }, [orderBook, baseToken, quoteToken.decimals, showVirtual]);

  const hasVirtualData = orderBook &&
    ((orderBook.virtual_bids && orderBook.virtual_bids.length > 0) ||
     (orderBook.virtual_asks && orderBook.virtual_asks.length > 0));

  if (!baseToken) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          height: "100%",
          minHeight: 400,
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

  const hasData = mergedAsks.length > 0 || mergedBids.length > 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%", minHeight: 400, display: "flex", flexDirection: "column", overflow: "hidden", transition: 'border-color 0.2s', '&:hover': { borderColor: 'rgba(254,107,139,0.35)' } }}>
      {/* Header with controls */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6">Order Book</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {isStale && (
            <Tooltip title="Order book data may be stale">
              <WarningAmberIcon sx={{ fontSize: 16, color: "warning.main" }} />
            </Tooltip>
          )}
          {loading && <CircularProgress size={16} />}
          {hasVirtualData && (
            <Tooltip title={showVirtual ? "Hide AMM liquidity" : "Show AMM liquidity"}>
              <IconButton
                size="small"
                onClick={() => setShowVirtual(!showVirtual)}
                aria-label={showVirtual ? "Hide AMM liquidity" : "Show AMM liquidity"}
                sx={{
                  color: showVirtual ? "primary.main" : "text.secondary",
                }}
              >
                {showVirtual ? (
                  <VisibilityIcon fontSize="small" />
                ) : (
                  <VisibilityOffIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* View mode toggle */}
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_e, newMode) => newMode && setViewMode(newMode)}
        size="small"
        fullWidth
        sx={{ mb: 1 }}
      >
        <ToggleButton value="sell">Sell</ToggleButton>
        <ToggleButton value="buy">Buy</ToggleButton>
        <ToggleButton value="both">Both</ToggleButton>
      </ToggleButtonGroup>

      {!hasData ? (
        <Box
          sx={{
            height: "calc(100% - 40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No orders for this pair
          </Typography>
        </Box>
      ) : (
        <TableView
          mergedAsks={mergedAsks}
          mergedBids={mergedBids}
          maxCumulativeErg={maxCumulativeErg}
          baseToken={baseToken}
          quoteToken={quoteToken}
          orderBook={orderBook}
          onPriceClick={onPriceClick}
          viewMode={viewMode}
        />
      )}
    </Paper>
  );
};

// ============================================================
// Table View
// ============================================================

interface TableViewProps {
  mergedAsks: MergedRow[];
  mergedBids: MergedRow[];
  maxCumulativeErg: number;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  orderBook: OrderBookData | null;
  onPriceClick?: (price: number, amount?: number) => void;
  viewMode: "buy" | "sell" | "both";
}

const TableView: FC<TableViewProps> = ({
  mergedAsks,
  mergedBids,
  maxCumulativeErg,
  baseToken,
  quoteToken,
  orderBook,
  onPriceClick,
  viewMode,
}) => {
  const theme = useTheme();
  const baseDec = Math.pow(10, baseToken.decimals);
  const quoteDec = Math.pow(10, quoteToken.decimals);

  // Refs for auto-scroll to spread on initial load or pair change
  const spreadRef = useRef<HTMLTableRowElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Reset scroll flag when the token pair changes
  const pairKey = `${baseToken.tokenId}:${quoteToken.tokenId}`;
  const lastPairRef = useRef<string>(pairKey);
  const shouldScrollRef = useRef(true);
  if (pairKey !== lastPairRef.current) {
    lastPairRef.current = pairKey;
    shouldScrollRef.current = true;
  }

  // Auto-scroll to spread row on initial load or pair change only
  useEffect(() => {
    if (viewMode === "both" && shouldScrollRef.current && spreadRef.current && containerRef.current && orderBook) {
      const container = containerRef.current;
      const row = spreadRef.current;
      container.scrollTop = row.offsetTop - container.clientHeight / 2;
      shouldScrollRef.current = false;
    }
  }, [orderBook]);

  // Best bid/ask for spread
  const bestAsk = mergedAsks.length > 0 ? mergedAsks[0].price : null;
  const bestBid = mergedBids.length > 0 ? mergedBids[0].price : null;
  const spread = bestAsk && bestBid ? ((bestAsk - bestBid) / bestAsk) * 100 : null;

  // Compute cumulative base amounts for click-to-fill
  const computeDisplayBaseAmount = (row: MergedRow, side: "ask" | "bid") => {
    if (side === "ask") {
      return (row.realAmount + row.virtualAmount) / baseDec;
    } else {
      const realBaseAmount = row.realAmount / quoteDec / row.price;
      const virtualBaseAmount = row.virtualAmount / baseDec;
      return realBaseAmount + virtualBaseAmount;
    }
  };

  const askCumulativeBase = useMemo(() => {
    let cum = 0;
    return mergedAsks.map(row => {
      cum += computeDisplayBaseAmount(row, "ask");
      return cum;
    });
  }, [mergedAsks, baseDec]);

  const bidCumulativeBase = useMemo(() => {
    let cum = 0;
    return mergedBids.map(row => {
      cum += computeDisplayBaseAmount(row, "bid");
      return cum;
    });
  }, [mergedBids, baseDec, quoteDec]);

  const renderRow = (row: MergedRow, side: "ask" | "bid", index: number, cumulativeBaseAmount?: number) => {
    const depthPercent = maxCumulativeErg > 0
      ? (row.cumulativeErg / maxCumulativeErg) * 100
      : 0;
    const color = side === "ask" ? theme.palette.error.main : theme.palette.success.main;
    const onlyVirtual = row.isVirtual && !row.isReal;

    // Calculate display amounts
    let displayBaseAmount: number;

    if (side === "ask") {
      const totalRaw = row.realAmount + row.virtualAmount;
      displayBaseAmount = totalRaw / baseDec;
    } else {
      // Bids: realAmount is in quote raw units, virtualAmount is in base raw units
      const realBaseAmount = row.realAmount / quoteDec / row.price;
      const virtualBaseAmount = row.virtualAmount / baseDec;
      displayBaseAmount = realBaseAmount + virtualBaseAmount;
    }

    // Total column shows cumulative ERG value (depth)
    const displayTotal = row.cumulativeErg;

    return (
      <TableRow
        key={`${side}-${index}`}
        sx={{
          background: `linear-gradient(to left, ${color}${onlyVirtual ? "22" : "33"} ${depthPercent}%, transparent ${depthPercent}%)`,
          cursor: onPriceClick ? "pointer" : "default",
          "&:hover": onPriceClick ? { bgcolor: "action.hover" } : {},
          opacity: onlyVirtual ? 0.7 : 1,
        }}
        tabIndex={onPriceClick ? 0 : undefined}
        role={onPriceClick ? "button" : undefined}
        onClick={() => onPriceClick?.(row.price, cumulativeBaseAmount)}
        onKeyDown={(e) => {
          if (onPriceClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onPriceClick(row.price, cumulativeBaseAmount);
          }
        }}
      >
        <TableCell
          sx={{
            py: 0.5,
            color,
            fontStyle: onlyVirtual ? "italic" : "normal",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {formatFullNumber(row.price, 6)}
            {onlyVirtual && (
              <Box
                component="span"
                sx={{
                  fontSize: "0.6rem",
                  bgcolor: `${color}20`,
                  color,
                  px: 0.5,
                  borderRadius: "3px",
                  lineHeight: 1.4,
                  fontStyle: "normal",
                }}
              >
                AMM
              </Box>
            )}
            {row.isVirtual && row.isReal && (
              <Box
                component="span"
                sx={{
                  fontSize: "0.6rem",
                  bgcolor: `${theme.palette.info.main}20`,
                  color: theme.palette.info.main,
                  px: 0.5,
                  borderRadius: "3px",
                  lineHeight: 1.4,
                  fontStyle: "normal",
                }}
              >
                +AMM
              </Box>
            )}
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ py: 0.5 }}>
          {formatFullNumber(displayBaseAmount, 4)}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.5 }}>
          {formatFullNumber(displayTotal, 2)}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <TableContainer ref={containerRef} sx={{ flex: 1, overflow: "auto" }}>
      <Table size="small" sx={{ width: "100%", height: "100%" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 0.5 }}>
              Price ({quoteToken.ticker})
            </TableCell>
            <TableCell align="right" sx={{ py: 0.5 }}>
              Amount ({baseToken.ticker})
            </TableCell>
            <TableCell align="right" sx={{ py: 0.5 }}>
              Total ({quoteToken.ticker})
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Asks - reversed so highest is at top */}
          {(viewMode === "sell" || viewMode === "both") &&
            mergedAsks
              .slice()
              .reverse()
              .map((row, i) => {
                const originalIdx = mergedAsks.length - 1 - i;
                return renderRow(row, "ask", i, askCumulativeBase[originalIdx]);
              })}

          {/* Spread indicator */}
          {viewMode === "both" && bestAsk && bestBid && (
            <TableRow ref={spreadRef}>
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
                  {orderBook?.pool_mid_price
                    ? formatFullNumber(orderBook.pool_mid_price, 6)
                    : formatFullNumber(bestAsk, 6)}
                </Typography>
                {spread !== null && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: spread < 2
                        ? theme.palette.success.main
                        : spread < 5
                          ? theme.palette.warning.main
                          : theme.palette.error.main,
                    }}
                  >
                    Spread: {spread.toFixed(2)}%
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          )}

          {/* Bids */}
          {(viewMode === "buy" || viewMode === "both") &&
            mergedBids.map((row, i) => renderRow(row, "bid", i, bidCumulativeBase[i]))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrderBook;
