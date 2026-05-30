export const bytesToSize = (bytes: any) => {
  var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

export const aspectRatioResize = (
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
) => {
  const isLandscape: boolean = sourceWidth > sourceHeight;

  let newHeight: number;
  let newWidth: number;

  if (isLandscape) {
    newHeight = (maxWidth * sourceHeight) / sourceWidth;
    newWidth = maxWidth;
  } else {
    newWidth = (maxHeight * sourceWidth) / sourceHeight;
    newHeight = maxHeight;
  }

  return {
    width: newWidth.toString() + "px",
    // height: newHeight.toString() + 'px',
    "&::after": {
      paddingTop: ((newHeight / newWidth) * 100).toString() + "%",
      display: "block",
      content: '""',
    },
  };
};

export const formatNumber = (
  num: number,
  sigFig: number = 3,
  fixed?: boolean,
  noNeg?: boolean
) => {
  const sign = noNeg ? "" : num < 0 ? "-" : "";
  const absNum = Math.abs(num);

  const formatSmallNumber = (number: number) => {
    if (number === 0) return "0";

    const magnitude = Math.floor(Math.log10(number));
    const multiplier = Math.pow(10, sigFig - magnitude - 1);
    const rounded = Math.round(number * multiplier) / multiplier;

    return rounded.toString();
  };

  if (absNum >= 1000000000000) {
    return sign + (absNum / 1000000000000).toFixed(2).replace(/\.0$/, "") + "T";
  } else if (absNum >= 1000000000) {
    return sign + (absNum / 1000000000).toFixed(2).replace(/\.0$/, "") + "B";
  } else if (absNum >= 1000000) {
    return sign + (absNum / 1000000).toFixed(2).replace(/\.0$/, "") + "M";
  } else if (absNum >= 1000) {
    return sign + (absNum / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  } else if (fixed && absNum < 10) {
    return sign + absNum.toFixed(sigFig);
  } else if (absNum >= 1) {
    // Round numbers close to whole numbers
    const rounded =
      Math.round(absNum * Math.pow(10, sigFig)) / Math.pow(10, sigFig);
    return sign + parseFloat(rounded.toFixed(sigFig)).toString();
  } else {
    return sign + formatSmallNumber(absNum);
  }
};

/**
 * Format a number as a full-precision financial value with locale-aware
 * thousands separators and no abbreviations (K, M, B, T).
 *
 * Use this for TVL, volume, balances, position values, and other financial
 * absolute numbers where precision matters. For compact display contexts
 * (tooltips, badges, sparklines), use {@link formatNumber} instead.
 *
 * @param value  - The number to format
 * @param decimals - Number of decimal places (default: 2, max: 9)
 * @returns Formatted string with thousands separators (e.g. "1,234,567.89")
 */
export const formatFullNumber = (value: number, decimals?: number): string => {
  const maxDecimals = Math.min(decimals ?? 2, 9);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
};

/**
 * Normalize a ticker string for display.
 * "erg" → "ERG" (the blockchain's native token has a special-cased lowercase name from the API).
 * All other tickers pass through unchanged to preserve readability (e.g., "rsBTC").
 */
export const normalizeTicker = (ticker: string): string => {
  return ticker === "erg" ? "ERG" : ticker;
};

export const stringToUrl = (str: string): string | undefined => {
  if (str) {
    // Replace all spaces with dashes and convert to lowercase
    str = str.replace(/\s+/g, "-").toLowerCase();
    // Remove all special characters using a regular expression
    str = str.replace(/[^\w-]+/g, "");
    return str;
  } else return undefined;
};

export const slugify = (str: string) => {
  const urlSafeChars = /[a-z0-9-]/;
  const slug = str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  let encodedSlug = "";
  for (let i = 0; i < slug.length; i++) {
    encodedSlug += urlSafeChars.test(slug[i])
      ? slug[i]
      : encodeURIComponent(slug[i]);
  }

  return encodeURIComponent(encodedSlug);
};

export const getShortAddress = (address: string): string => {
  let shortAddress = address ? address : "";
  shortAddress =
    shortAddress.length < 10
      ? shortAddress
      : shortAddress.substring(0, 6) +
      "..." +
      shortAddress.substring(shortAddress.length - 4, shortAddress.length);

  return shortAddress;
};
export const getShorterAddress = (
  address: string,
  substring?: number
): string => {
  let shortAddress = address ? address : "";
  shortAddress =
    shortAddress.length < 5
      ? shortAddress
      : shortAddress.substring(0, substring ? substring : 3) +
      ".." +
      shortAddress.substring(
        shortAddress.length - (substring ? substring : 3),
        shortAddress.length
      );

  return shortAddress;
};

export const isErgoMainnetAddress = (value: string): boolean => {
  const base58Chars =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return (
    value.startsWith("9") &&
    value.length === 51 &&
    [...value].every((char) => base58Chars.includes(char))
  );
};

export const adjustDecimals = (amount: number, decimals: number): number => {
  return amount / Math.pow(10, decimals);
};

export const adjustDecimalsBigInt = (amount: bigint, decimals: bigint): bigint => {
  return amount / (BigInt(10) ** decimals);
};

/**
 * Calculate the exchange rate between two tokens when each token's price is expressed in a common unit (e.g. ERG).
 *
 * Given:
 *   basePrice = price of 1 base token in common unit
 *   quotePrice = price of 1 quote token in common unit
 *
 * Returns: how many quote tokens are needed to buy 1 base token.
 *
 * Examples:
 *   - ERG (1) / USE (0.333) → 3.0  (1 ERG = 3 USE)
 *   - CRUX (0.0001) / ERG (1) → 0.0001  (1 CRUX = 0.0001 ERG)
 *   - CRUX (0.0001) / USE (0.333) → 0.0003003  (1 CRUX = 0.0003 USE)
 *
 * Edge cases:
 *   - If either price is 0, null, undefined, or NaN → returns 0
 *   - If quotePrice is Infinity → returns 0
 */
export const calculatePairPrice = (
  basePrice: number | null | undefined,
  quotePrice: number | null | undefined
): number => {
  const base = typeof basePrice === "number" && !isNaN(basePrice) ? basePrice : 0;
  const quote = typeof quotePrice === "number" && !isNaN(quotePrice) ? quotePrice : 0;

  if (base === 0 || quote === 0 || !isFinite(quote)) {
    return 0;
  }

  return base / quote;
};