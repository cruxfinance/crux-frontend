interface ITokenData {
  name: string;
  ticker: string;
  tokenId: string;
  icon: string;
  price: number;
  pctChange1h: number;
  pctChange1d: number;
  pctChange1w: number;
  pctChange1m: number;
  vol: number;
  liquidity: number;
  buys: number;
  sells: number;
  mktCap: number;
}

interface IApiTokenData {
  id: string;
  ticker: string;
  name: string;
  exchanges: string[];
  price_erg: number;
  erg_price_usd: number;
  hour_change_erg: number;
  hour_change_usd: number;
  day_change_erg: number;
  day_change_usd: number;
  week_change_erg: number;
  week_change_usd: number;
  month_change_erg: number;
  month_change_usd: number;
  volume: number;
  liquidity: number;
  market_cap: number;
  buys: number;
  sells: number;
  unique_buys: number;
  unique_sells: number;
  created: number;
}

interface IFilters {
  price_min?: number;
  price_max?: number;
  liquidity_min?: number;
  liquidity_max?: number;
  market_cap_min?: number;
  market_cap_max?: number;
  pct_change_min?: number;
  pct_change_max?: number;
  volume_min?: number;
  volume_max?: number;
  buys_min?: number;
  buys_max?: number;
  sells_min?: number;
  sells_max?: number;
}

interface ISorting {
  sort_by?: string;
  sort_order?: "Desc" | "Asc";
}

interface IQueries {
  limit: number;
  offset: number;
}

interface ITimeframe {
  filter_window: "Hour" | "Day" | "Week" | "Month";
}

interface ITrade {
  time: number;
  action_type: "Buy" | "Sell" | "Liquidity Removal" | "Liquidity Provision";
  price_in_ergo: number;
  ergo_price: number;
  action_amount: string;
  user_address: string;
}

// for positions API
type PriceInfo = {
  erg: number;
  usd: number;
};

interface Signature {
  signedMessage: string;
  proof: string;
}

type NonceResponse = {
  nonce: string;
  userId: string;
};

type Anchor = "bottom" | "left" | "right" | "top" | undefined;
