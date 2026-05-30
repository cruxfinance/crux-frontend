import React, { FC, useState, useEffect, useCallback } from "react";
import {
  Avatar,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  LinearProgress,
  Skeleton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useAlert } from "@contexts/AlertContext";
import { useWallet } from "@contexts/WalletContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
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

interface OpenOrdersPanelProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
  refreshTrigger?: number;
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
  is_mempool?: boolean;
}


const OpenOrdersPanel: FC<OpenOrdersPanelProps> = ({
  baseToken,
  quoteToken,
  refreshTrigger,
  onCountChange,
  userAddresses,
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert();
  const { dAppWallet } = useWallet();
  const { minerFee } = useMinerFee();

  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [confirmCancelOrder, setConfirmCancelOrder] =
    useState<LimitOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    if (userAddresses.length === 0) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      const allOrders: LimitOrder[] = [];

      for (const address of userAddresses.slice(0, 5)) {
        const params = new URLSearchParams({
          owner_address: address,
          status: "open,partial",
          limit: "50",
        });

        const response = await fetch(
          `${process.env.CRUX_API}/dex/orders?${params}`,
        );

        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result)) {
            allOrders.push(...result);
          }
        }
      }

      const uniqueOrders = allOrders.filter(
        (order, index, self) =>
          index === self.findIndex((o) => o.order_id === order.order_id),
      );

      uniqueOrders.sort((a, b) => b.created_at - a.created_at);

      setOrders(uniqueOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }, [userAddresses]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders, refreshTrigger]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(orders.length);
    }
  }, [orders.length, onCountChange]);

  const handleCancelClick = (order: LimitOrder) => {
    setConfirmCancelOrder(order);
  };

  const handleCancelConfirm = async () => {
    if (!confirmCancelOrder || !window.ergoConnector?.nautilus) return;

    const order = confirmCancelOrder;
    setConfirmCancelOrder(null);
    setCancellingOrderId(order.order_id);

    try {
      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();

      const requestBody = {
        order_id: order.order_id,
        user_addresses: userAddresses.join(","),
        miner_fee: minerFee,
      };

      const response = await fetch(
        `${process.env.CRUX_API}/dex/limit_order/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.unsigned_tx) {
        throw new Error("No transaction returned from API");
      }

      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await context.submit_tx(signedTx);

      addAlert("success", `Order cancelled! TX: ${txId.slice(0, 8)}...`);

      setOrders((prev) => prev.filter((o) => o.order_id !== order.order_id));
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      addAlert(
        "error",
        error.info || error.message || "Failed to cancel order",
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getOrderSide = (order: LimitOrder): "buy" | "sell" => {
    const givenIsQuote =
      order.given_token_id === null ||
      order.given_token_id === ERG_TOKEN_ID ||
      order.given_token_id === quoteToken.tokenId;
    return givenIsQuote ? "buy" : "sell";
  };

  const getPrice = (order: LimitOrder): number => {
    if (order.price_denominator === 0) return 0;
    const rawRatio = order.price_numerator / order.price_denominator;
    const givenDec = order.given_token_decimals || 9;
    const takenDec = order.taken_token_decimals || 9;
    const side = getOrderSide(order);
    if (side === "buy") {
      return Math.pow(10, takenDec) / (rawRatio * Math.pow(10, givenDec));
    } else {
      return (rawRatio * Math.pow(10, givenDec)) / Math.pow(10, takenDec);
    }
  };

  const getFilledPercent = (order: LimitOrder): number => {
    if (order.original_given_amount === 0) return 0;
    const filled = order.original_given_amount - order.remaining_given_amount;
    const percent = (filled / order.original_given_amount) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  const getDisplayAmount = (
    order: LimitOrder,
  ): { filled: number; original: number; token: string } => {
    const side = getOrderSide(order);
    const givenDec = order.given_token_decimals || 9;

    if (side === "buy") {
      const price = getPrice(order);
      if (price === 0) {
        return {
          filled: 0,
          original: 0,
          token: order.taken_token_name || "token",
        };
      }
      const filledErg =
        (order.original_given_amount - order.remaining_given_amount) /
        Math.pow(10, givenDec);
      const originalErg = order.original_given_amount / Math.pow(10, givenDec);
      return {
        filled: filledErg / price,
        original: originalErg / price,
        token: order.taken_token_name || "token",
      };
    } else {
      const filled =
        (order.original_given_amount - order.remaining_given_amount) /
        Math.pow(10, givenDec);
      const original = order.original_given_amount / Math.pow(10, givenDec);
      return {
        filled,
        original,
        token: order.given_token_name || "token",
      };
    }
  };

  const getPairDisplay = (order: LimitOrder): string => {
    const side = getOrderSide(order);
    if (side === "buy") {
      return `${normalizeTicker(order.taken_token_name || "token")}/${normalizeTicker(order.given_token_name || "ERG")}`;
    } else {
      return `${normalizeTicker(order.given_token_name || "token")}/${normalizeTicker(order.taken_token_name || "ERG")}`;
    }
  };

  const getTokenForAvatar = (
    order: LimitOrder,
    side: "buy" | "sell",
    which: "base" | "quote",
  ): { token: TokenInfo | null; fallback: string } => {
    if (which === "base") {
      const id = side === "buy" ? order.taken_token_id : order.given_token_id;
      const name = side === "buy" ? order.taken_token_name : order.given_token_name;
      if (baseToken && id === baseToken.tokenId) return { token: baseToken, fallback: baseToken.ticker };
      if (id === quoteToken.tokenId) return { token: quoteToken, fallback: quoteToken.ticker };
      return { token: null, fallback: name || "?" };
    }
    const id = side === "buy" ? order.given_token_id : order.taken_token_id;
    const name = side === "buy" ? order.given_token_name : order.taken_token_name;
    if (id === quoteToken.tokenId || id === null || id === ERG_TOKEN_ID)
      return { token: quoteToken, fallback: quoteToken.ticker };
    if (baseToken && id === baseToken.tokenId) return { token: baseToken, fallback: baseToken.ticker };
    return { token: null, fallback: name || "?" };
  };

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

  const headerCellSx = {
    py: 0.5,
    whiteSpace: "nowrap" as const,
    backgroundColor: theme.palette.background.paper,
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        {Array.from({ length: 6 }).map((_, j) => (
          <TableCell key={j} sx={{ py: 0.5 }}>
            <Skeleton variant="text" width={j === 0 ? 90 : j === 1 ? 50 : 60} />
          </TableCell>
        ))}
      </TableRow>
    ));

  const renderFilledCell = (filledPercent: number, amt: { filled: number; original: number; token: string }) => {
    if (filledPercent === 0) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
          <Typography variant="caption" color="text.secondary">
            0%
          </Typography>
        </Box>
      );
    }
    if (filledPercent >= 100) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
          <Typography variant="caption" color="success.main" fontWeight={500}>
            100%
          </Typography>
        </Box>
      );
    }
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
          <Typography variant="caption" color="primary">
            {formatFullNumber(amt.filled, 4)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            /
          </Typography>
          <Typography variant="caption">
            {formatFullNumber(amt.original, 4)} {amt.token}
          </Typography>
        </Box>
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
      </Box>
    );
  };

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
          Connect wallet to view your orders
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box>
        {loading && !initialLoading && orders.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <CircularProgress size={18} />
          </Box>
        )}

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
                  <TableCell sx={headerCellSx} align="right">Filled</TableCell>
                  <TableCell sx={headerCellSx} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{renderSkeletonRows()}</TableBody>
            </Table>
          </TableContainer>
        ) : orders.length === 0 ? (
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
              No open orders
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerCellSx, width: 120 }}>Date</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 100 }}>Pair</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 50 }}>Side</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 110 }} align="right">Price</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 110 }} align="right">Amount</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 120 }} align="right">Filled</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 60 }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => {
                  const side = getOrderSide(order);
                  const price = getPrice(order);
                  const filledPercent = getFilledPercent(order);
                  const isCancelling = cancellingOrderId === order.order_id;
                  const amt = getDisplayAmount(order);
                  const baseTokenInfo = getTokenForAvatar(order, side, "base");
                  const quoteTokenInfo = getTokenForAvatar(order, side, "quote");

                  const isMempool = order.is_mempool === true;
                  const isPendingFill =
                    order.status === "pending_fill" ||
                    order.status === "pending_partial_fill";
                  const isPendingCancel = order.status === "pending_cancel";
                  const hasMempoolStatus =
                    isMempool || isPendingFill || isPendingCancel;

                  const tooltipContent = [
                    `Created: ${formatFullTime(order.created_at)}`,
                    order.updated_at !== order.created_at
                      ? `Updated: ${formatFullTime(order.updated_at)}`
                      : null,
                    `Order ID: ${order.order_id.slice(0, 16)}...`,
                    isMempool ? "Status: Unconfirmed (in mempool)" : null,
                    isPendingFill ? "Status: Pending fill" : null,
                    isPendingCancel ? "Status: Pending cancellation" : null,
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
                          ...(hasMempoolStatus && {
                            opacity: 0.7,
                            borderLeft: `3px dashed ${
                              isPendingCancel
                                ? theme.palette.error.main
                                : isPendingFill
                                  ? theme.palette.success.main
                                  : theme.palette.warning.main
                            }`,
                          }),
                        }}
                      >
                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="caption">
                            {formatTime(order.created_at)}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem" }}>
                            {getPairDisplay(order)}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 0.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
                            {isMempool && (
                              <Chip
                                label="UNCONFIRMED"
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ height: 18, fontSize: "0.6rem" }}
                              />
                            )}
                            {isPendingFill && (
                              <Chip
                                label="FILLING"
                                size="small"
                                variant="outlined"
                                color="success"
                                sx={{ height: 18, fontSize: "0.6rem" }}
                              />
                            )}
                            {isPendingCancel && (
                              <Chip
                                label="CANCELLING"
                                size="small"
                                variant="outlined"
                                color="error"
                                sx={{ height: 18, fontSize: "0.6rem" }}
                              />
                            )}
                          </Box>
                        </TableCell>

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
                            <Avatar
                              src={quoteTokenInfo.token?.icon || ""}
                              sx={{
                                width: 14,
                                height: 14,
                                fontSize: "0.5rem",
                                bgcolor: "rgba(255,255,255,0.1)",
                              }}
                            >
                              {quoteTokenInfo.fallback[0]?.toUpperCase() || "?"}
                            </Avatar>
                          </Box>
                        </TableCell>

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
                              {formatFullNumber(amt.original, 4)}
                            </Typography>
                            <Avatar
                              src={baseTokenInfo.token?.icon || ""}
                              sx={{
                                width: 14,
                                height: 14,
                                fontSize: "0.5rem",
                                bgcolor: "rgba(255,255,255,0.1)",
                              }}
                            >
                              {baseTokenInfo.fallback[0]?.toUpperCase() || "?"}
                            </Avatar>
                          </Box>
                        </TableCell>

                        <TableCell align="right" sx={{ py: 0.5 }}>
                          {renderFilledCell(filledPercent, amt)}
                        </TableCell>

                        <TableCell align="center" sx={{ py: 0.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
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
                            {isPendingCancel ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Tooltip
                                title={
                                  isMempool
                                    ? "Cannot cancel unconfirmed order"
                                    : "Cancel Order"
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCancelClick(order)}
                                    disabled={
                                      isCancelling || isMempool || isPendingFill
                                    }
                                    color="error"
                                    sx={{ p: 0.25 }}
                                  >
                                    {isCancelling ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <CancelIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    </Tooltip>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog
        open={!!confirmCancelOrder}
        onClose={() => setConfirmCancelOrder(null)}
      >
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this order? Your funds will be
            returned to your wallet.
          </Typography>
          {confirmCancelOrder && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: theme.palette.background.default,
                borderRadius: 1,
              }}
            >
              <Typography variant="body2">
                <strong>Pair:</strong> {getPairDisplay(confirmCancelOrder)}
              </Typography>
              <Typography variant="body2">
                <strong>Price:</strong>{" "}
                {formatFullNumber(getPrice(confirmCancelOrder), 6)}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong>{" "}
                {(() => {
                  const amt = getDisplayAmount(confirmCancelOrder);
                  return `${formatFullNumber(amt.original, 4)} ${amt.token}`;
                })()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancelOrder(null)}>
            Keep Order
          </Button>
          <Button
            onClick={handleCancelConfirm}
            color="error"
            variant="contained"
          >
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OpenOrdersPanel;