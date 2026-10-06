// v3 fields that /dex/orders adds to a limit order row. v2 rows omit them
// (version may be "v2" or absent).
export interface V3OrderFields {
  version?: string;
  effective_status?: string;
  fill_count?: number;
  total_sold?: number;
  total_bought?: number;
}

interface OrderAmounts extends V3OrderFields {
  original_given_amount: number;
  remaining_given_amount: number;
  taken_token_decimals: number | null;
}

export const isV3Order = (order: V3OrderFields): boolean =>
  order.version === "v3";

export const isPastExpiry = (order: V3OrderFields): boolean =>
  isV3Order(order) && order.effective_status === "past_expiry";

/**
 * Filled percentage of a v3 order. /dex/orders has no "total" field, so it is
 * total_sold + remaining_given_amount: the amount sold so far plus what is
 * still on offer. (original_given_amount - remaining would count a fee paid in
 * the given asset as filled.)
 */
export const v3FilledPercent = (order: OrderAmounts): number => {
  const sold = order.total_sold ?? 0;
  const total = sold + order.remaining_given_amount;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (sold / total) * 100));
};

/** total_bought in whole units of the taken token, or 0 if none yet. */
export const v3ReceivedAmount = (order: OrderAmounts): number =>
  (order.total_bought ?? 0) / Math.pow(10, order.taken_token_decimals ?? 9);
