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

type PriceInfo = {
  erg: number;
  usd: number;
};


type PriceInfoUppercase = {
  ERG: number;
  USD: number;
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

type Credentials = {
  nonce: string;
  userId: string;
  signature: string;
  wallet: string;
};

type ParsedWallet = {
  type: "mobile" | "nautilus";
  defaultAddress: string;
  usedAddresses: string[];
  unusedAddresses: string[];
};

interface SideNavItem {
  header: string;
  items: { subtitle: string; link?: string }[];
}

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type Severity = "info" | "error" | "success" | "warning";

type WalletButtonProps = {
  name: string;
  walletType: string;
  icon: string;
  iconDark: string;
  messageSigning: boolean;
}

interface WalletListItem {
  addresses: string[];
  name: string;
}

type TReport = {
  id: string;
  reportFilename: string | null;
  koinlyGenerating: boolean;
  customName: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  wallets: Prisma.JsonValue;
  taxYear: number | null;
  status: $Enums.ReportStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

interface IPaymentAmount {
  tokenId: string;
  amount: number;
  decimals: number;
}

interface TransferAmount {
  tokenId: string;
  amount: number;
}

type TokenInfoApi = {
  token_id: string;
  token_name: string;
  token_description: string;
  decimals: number;
  minted: number;
  value_in_erg: number;
  locked_supply: number;
  liquid_supply: number;
  burned_supply: number;
};

interface AllowedToken {
  id: string;
  name: string;
  icon: string | null;
  decimals: number;
}

interface AssetInfoV2Item {
  name: string;
  tokenId?: string;
  description: string;
  decimals: number;
  minted: number;
  hash: string;
  link: string;
  royalties: Royalty[];
  properties?: {
    [key: string]: string | undefined;
  };
  levels?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  collection?: string;
  additional_info?: {
    explicit: string;
    [key: string]: unknown;
  };
}

interface Royalty {
  address: string;
  percentage: number;
}

interface INftItem {
  imgUrl?: string;
  link: string;
  name: string;
  tokenId: string;
  qty?: number;
  price?: number;
  currency?: string;
  rarity?: string;
  artist?: string;
  artistLink?: string;
  collection?: string;
  collectionLink?: string;
  explicit?: boolean;
  type?: string;
  loading?: boolean;
  remainingVest?: number;
}

type IActiveToken = {
  symbol: string;
  amount: number;
  value: number;
  color: string;
} | null