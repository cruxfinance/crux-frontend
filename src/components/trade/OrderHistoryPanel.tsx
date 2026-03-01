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
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useWallet } from "@contexts/WalletContext";
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

interface OrderHistoryPanelProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
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

type StatusFilter = "all" | "filled" | "cancelled";

const ERG_TOKEN_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";

const OrderHistoryPanel: FC<OrderHistoryPanelProps> = ({
  baseToken,
  quoteToken,
}) => {
  const theme = useTheme();
  const { dAppWallet } = useWallet();

  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  // Fetch order history
  const fetchOrders = useCallback(async () => {
    if (userAddresses.length === 0) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      const allOrders: LimitOrder[] = [];

      // Determine status filter
      const statusParam =
        statusFilter === "all"
          ? "filled,cancelled,expired"
          : statusFilter === "filled"
            ? "filled"
            : "cancelled,expired";

      for (const address of userAddresses.slice(0, 5)) {
        const params = new URLSearchParams({
          owner_address: address,
          status: statusParam,
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

      // Remove duplicates
      const uniqueOrders = allOrders.filter(
        (order, index, self) =>
          index === self.findIndex((o) => o.order_id === order.order_id),
      );

      // Sort by updated_at descending
      uniqueOrders.sort((a, b) => b.updated_at - a.updated_at);

      setOrders(uniqueOrders);
    } catch (error) {
      console.error("Error fetching order history:", error);
    } finally {
      setLoading(false);
    }
  }, [userAddresses, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusFilterChange = (
    _: React.MouseEvent<HTMLElement>,
    newFilter: StatusFilter | null,
  ) => {
    if (newFilter) {
      setStatusFilter(newFilter);
    }
  };

  const getOrderSide = (order: LimitOrder): "buy" | "sell" => {
    const givenIsQuote =
      order.given_token_id === null ||
      order.given_token_id === ERG_TOKEN_ID ||
      order.given_token_id === quoteToken.tokenId;
    return givenIsQuote ? "buy" : "sell";
  };

  const getPrice = (order: LimitOrder, side: "buy" | "sell"): number => {
    if (order.price_denominator === 0) return 0;
    const rawPrice = order.price_numerator / order.price_denominator;
    const givenDecimals = order.given_token_decimals ?? 9;
    const takenDecimals = order.taken_token_decimals ?? 9;
    const decimalAdjustment = Math.pow(10, givenDecimals - takenDecimals);
    const adjustedPrice = rawPrice * decimalAdjustment;
    // For buy orders, invert price to display in base/quote terms (ERG per token)
    return side === "buy" ? 1 / adjustedPrice : adjustedPrice;
  };

  const getFilledPercent = (order: LimitOrder): number => {
    if (order.original_given_amount === 0) return 0;
    const filled = order.original_given_amount - order.remaining_given_amount;
    return (filled / order.original_given_amount) * 100;
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
        return "Filling...";
      case "pending_partial_fill":
        return "Filling...";
      case "pending_cancel":
        return "Cancelling...";
      default:
        return status;
    }
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
          Connect wallet to view order history
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
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
        <Typography variant="h6">Order History</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {loading && <CircularProgress size={16} />}
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleStatusFilterChange}
            size="small"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="filled">Filled</ToggleButton>
            <ToggleButton value="cancelled">Cancelled</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {orders.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No order history found
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 0.5 }}>Date</TableCell>
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
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => {
                const side = getOrderSide(order);
                const price = getPrice(order, side);
                const filledPercent = getFilledPercent(order);
                const isPending = order.status.startsWith("pending_");

                return (
                  <TableRow
                    key={order.order_id}
                    sx={{
                      ...(isPending && {
                        opacity: 0.7,
                        borderLeft: `3px dashed ${theme.palette.warning.main}`,
                      }),
                    }}
                  >
                    <TableCell sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        {formatTime(order.updated_at)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        {order.given_token_name || "ERG"}/
                        {order.taken_token_name || "ERG"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Chip
                        label={side.toUpperCase()}
                        size="small"
                        color={side === "buy" ? "success" : "error"}
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        {formatNumber(price, 6)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        {formatNumber(
                          order.original_given_amount /
                            Math.pow(10, order.given_token_decimals || 9),
                          4,
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      <Typography
                        variant="caption"
                        color={filledPercent > 0 ? "primary" : "text.secondary"}
                      >
                        {filledPercent.toFixed(0)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      <Chip
                        label={getStatusLabel(order.status)}
                        size="small"
                        color={getStatusColor(order.status)}
                        variant={isPending ? "outlined" : "filled"}
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
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

export default OrderHistoryPanel;
