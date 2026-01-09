declare global {
  type DexyAnalytics = {
    instance: string;
    timestamp: number;
    stablecoinTotalSupply: number;
    stablecoinInBank: number;
    stablecoinInCirculation: number;
    stablecoinInCoreLp: number;
    stablecoinOnHands: number;
    ergInBank: number;
    ergInCoreLp: number;
    ergTvl: number;
    ergPriceUsd: number;
    bankReserveRatio: number;
    relativeReserveRatio: number;
    relativeRrWithLp: number;
    protocolTvlUsd: number;
  };

  type DexyHistoryPoint = {
    timestamp: number;
    value: number;
  };

  type DexyMetric =
    | "reserve_ratio"
    | "relative_reserve_ratio"
    | "relative_rr_with_lp"
    | "stablecoin_circulation"
    | "stablecoin_in_core_lp"
    | "stablecoin_on_hands"
    | "erg_in_bank"
    | "erg_tvl"
    | "protocol_tvl_usd";

  type DexyResolution = "1h" | "1d" | "1w";
}

export {};
