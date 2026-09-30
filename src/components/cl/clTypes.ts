/**
 * Response shapes of the ci-api CL endpoints, shared by the CL page, the
 * liquidity page and the portfolio. See ci-api's `entities::cl`.
 */

export interface ClPair {
  tokenX: string;
  tokenY: string;
}

export interface ClTokenMeta {
  name: string;
  decimals: number;
}

export interface ClPositionDto {
  position_id: string;
  box_id: string;
  pair_type: "erg_token" | "token_token";
  token_x: string;
  token_y: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fee_bps: number;
  /** Uncollected LP fees, raw units. */
  fee_x: number;
  fee_y: number;
  erg_value: number;
  price_lower: number;
  price_upper: number;
  price_current: number;
  liquidity: number;
  in_range: boolean;
  owned: boolean;
  /** Effective protocol-fee rate for this position's fee_bps, in bps of the
   * net input (`max(phi * fee_bps, floor_bps * 10000) / 10000`). */
  protocol_fee_bps: number;
  /** Lifetime gross taker input routed through the position, raw units. */
  volume_x: number;
  volume_y: number;
  /** Lifetime LP fees earned (collected or not), raw units. */
  fees_earned_x: number;
  fees_earned_y: number;
  swap_count: number;
  /** RFC3339 */
  created_at: string;
  created_height: number;
}

export interface ClPositionsResponse {
  positions: ClPositionDto[];
  tokens: Record<string, ClTokenMeta>;
  error?: string;
}

/** Per-pair aggregate returned by `GET /dex/cl/pairs`. */
export interface ClPairStats {
  token_x: string;
  token_y: string;
  positions: number;
  positions_in_range: number;
  reserve_x: number;
  reserve_y: number;
  /** Y per X, decimals-adjusted. */
  price_current: number | null;
  tvl_erg: number | null;
  tvl_usd: number | null;
  volume_24h_erg: number | null;
  volume_7d_erg: number | null;
  fees_24h_erg: number | null;
  fees_7d_erg: number | null;
  /** Fraction: 0.12 = 12%. */
  apr: number | null;
}

export interface ClPairsResponse {
  pairs: ClPairStats[];
  tokens: Record<string, ClTokenMeta>;
  error?: string;
}

/** A position with its value priced by `POST /dex/cl/portfolio`. */
export interface ClPortfolioPosition extends ClPositionDto {
  value_erg: number | null;
  uncollected_fees_erg: number | null;
  value_usd: number | null;
}

export interface ClPortfolioResponse {
  positions: ClPortfolioPosition[];
  total_value_erg: number;
  total_value_usd: number | null;
  tokens: Record<string, ClTokenMeta>;
  error?: string;
}
