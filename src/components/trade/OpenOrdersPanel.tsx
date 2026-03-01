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
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CancelIcon from "@mui/icons-material/Cancel";
import { useAlert } from "@contexts/AlertContext";
import { useWallet } from "@contexts/WalletContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { formatNumber } from "@lib/utils/general";

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

const ERG_TOKEN_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";

const OpenOrdersPanel: FC<OpenOrdersPanelProps> = ({
  baseToken,
  quoteToken,
  refreshTrigger,
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert();
  const { dAppWallet } = useWallet();
  const { minerFee } = useMinerFee();

  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [confirmCancelOrder, setConfirmCancelOrder] =
    useState<LimitOrder | null>(null);

  // Get user addresses
  const [userAddresses, setUserAddresses] = useState<string[]>([]);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!dAppWallet.connected || !window.ergoConnector?.nautilus) return;

      try {
        const ergoCnct = window.ergoConnector.nautilus;
        const context = await ergoCnct.getContext();
        const changeAddress = await context.get_change_address();
        const usedAddresses = await context.get_used_addresses();
        const unusedAddresses = await context.get_unused_addresses();

        const allAddresses = [
          changeAddress,
          ...usedAddresses,
          ...unusedAddresses,
        ];
        setUserAddresses([...new Set(allAddresses)]);
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };

    fetchAddresses();
  }, [dAppWallet.connected]);

  // Fetch open orders
  const fetchOrders = useCallback(async () => {
    if (userAddresses.length === 0) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch orders for each address
      const allOrders: LimitOrder[] = [];

      for (const address of userAddresses.slice(0, 5)) {
        // Limit to first 5 addresses
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

      // Remove duplicates by order_id
      const uniqueOrders = allOrders.filter(
        (order, index, self) =>
          index === self.findIndex((o) => o.order_id === order.order_id),
      );

      // Sort by created_at descending
      uniqueOrders.sort((a, b) => b.created_at - a.created_at);

      setOrders(uniqueOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [userAddresses]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders, refreshTrigger]);

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

      console.log("=== UNSIGNED TX ===");
      console.log(JSON.stringify(result.unsigned_tx, null, 2));

      const signedTx = await context.sign_tx(result.unsigned_tx);

      console.log("=== SIGNED TX ===");
      console.log(JSON.stringify(signedTx, null, 2));

      const txId = await context.submit_tx(signedTx);

      addAlert("success", `Order cancelled! TX: ${txId.slice(0, 8)}...`);

      // Remove from local state
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
    // If giving ERG (or quote token), it's a buy order
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
    // rawRatio = rate * 10^takenDec / 10^givenDec (where rate is taken/given in human units)
    // For display we want quote per base (ERG per token):
    // Buy (give ERG, take token): display = 1/rate = 10^takenDec / (rawRatio * 10^givenDec)
    // Sell (give token, take ERG): display = rate = rawRatio * 10^givenDec / 10^takenDec
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
    // Clamp to valid range [0, 100] to handle data inconsistencies
    return Math.max(0, Math.min(100, percent));
  };

  // Get display amount for an order
  // For BUY orders: show expected token amount to receive (filled/original)
  // For SELL orders: show token amount being sold (filled/original)
  const getDisplayAmount = (
    order: LimitOrder,
  ): { filled: number; original: number; token: string } => {
    const side = getOrderSide(order);
    const givenDec = order.given_token_decimals || 9;
    const takenDec = order.taken_token_decimals || 9;

    if (side === "buy") {
      // BUY order: giving ERG/quote, receiving base token
      // Calculate expected token amount based on price
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
      // SELL order: giving token, receiving ERG/quote
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

  // Get pair display string (base/quote format)
  const getPairDisplay = (order: LimitOrder): string => {
    const side = getOrderSide(order);
    if (side === "buy") {
      // BUY: receiving taken_token (base), giving given_token (quote)
      return `${order.taken_token_name || "token"}/${order.given_token_name || "ERG"}`;
    } else {
      // SELL: giving given_token (base), receiving taken_token (quote)
      return `${order.given_token_name || "token"}/${order.taken_token_name || "ERG"}`;
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!dAppWallet.connected) {
    return (
      <Paper
        variant="outlined"
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
      </Paper>
    );
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6">Open Orders ({orders.length})</Typography>
          {loading && <CircularProgress size={16} />}
        </Box>

        {orders.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No open orders
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Pair</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Side</TableCell>
                  <TableCell sx={{ py: 0.5 }} align="right">
                    Price
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }} align="right">
                    Amount
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }} align="right">
                    Filled
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }} align="center">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => {
                  const side = getOrderSide(order);
                  const price = getPrice(order);
                  const filledPercent = getFilledPercent(order);
                  const isCancelling = cancellingOrderId === order.order_id;

                  const isMempool = order.is_mempool === true;
                  const isPendingFill =
                    order.status === "pending_fill" ||
                    order.status === "pending_partial_fill";
                  const isPendingCancel = order.status === "pending_cancel";
                  const hasMempoolStatus =
                    isMempool || isPendingFill || isPendingCancel;

                  return (
                    <TableRow
                      key={order.order_id}
                      sx={{
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
                          {getPairDisplay(order)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Chip
                            label={side.toUpperCase()}
                            size="small"
                            color={side === "buy" ? "success" : "error"}
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
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
                        <Typography variant="caption">
                          {formatNumber(price, 6)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        <Typography variant="caption">
                          {(() => {
                            const amt = getDisplayAmount(order);
                            return `${formatNumber(amt.filled, 4)} / ${formatNumber(amt.original, 4)} ${amt.token}`;
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        <Typography
                          variant="caption"
                          color={
                            filledPercent > 0 ? "primary" : "text.secondary"
                          }
                        >
                          {filledPercent.toFixed(0)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5 }}>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Cancel Confirmation Dialog */}
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
                {formatNumber(getPrice(confirmCancelOrder), 6)}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong>{" "}
                {(() => {
                  const amt = getDisplayAmount(confirmCancelOrder);
                  return `${formatNumber(amt.original, 4)} ${amt.token}`;
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
