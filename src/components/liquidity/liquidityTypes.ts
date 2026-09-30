/** Row of `GET /dex/pools_apr`. */
export interface PoolWithApr {
  pool_id: string;
  pool_type: string;
  base_token_id: string;
  base_token_name: string;
  base_token_decimals: number;
  quote_token_id: string;
  quote_token_name: string;
  quote_token_decimals: number;
  base_amount: number;
  quote_amount: number;
  tvl_erg: number;
  fee_pct: number;
  volume_24h: number;
  apr_7d: number | null;
  apr_30d: number | null;
}

/** Row of `POST /dex/lp_positions` (Spectrum-style LP tokens). */
export interface LpPosition {
  pool_id: string;
  pool_type: string;
  lp_token_id: string;
  lp_token_name: string;
  lp_token_amount: number;
  share_of_pool: number;
  base_token: {
    token_id: string;
    name: string;
    decimals: number;
    amount: number;
    value_usd: number;
  };
  quote_token: {
    token_id: string;
    name: string;
    decimals: number;
    amount: number;
    value_usd: number;
  };
  total_value_usd: number;
  pool_tvl_usd: number;
}
