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

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
const toSubscript = (n: number): string =>
  String(n)
    .split("")
    .map((d) => SUBSCRIPT_DIGITS[Number(d)])
    .join("");

/**
 * Format a number to a digit budget: show as many significant digits as fit in
 * `maxDigits` (not counting sign, separators, decimal point, or suffix),
 * preferring the most significant.
 *
 * Numbers whose integer part exceeds the budget are abbreviated with K, M, B or
 * T (and exponent notation from 1e15). Values below 1 with four or more zeros
 * after the decimal point use subscript-zero notation (`0.0₅1235`). Trailing
 * fractional zeros are stripped unless `keepTrailingZeros` is set; `noNeg`
 * omits the minus sign so the caller can render it.
 *
 * @param value - The number to format
 * @param maxDigits - Digit budget (default: 4)
 * @returns Formatted string, e.g. "1,235", "150.1K", "0.00012", "0.0₅12"
 */
export const formatNumber = (
  value: number,
  maxDigits: number = 4,
  options?: { keepTrailingZeros?: boolean; noNeg?: boolean },
): string => {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";

  const keep = options?.keepTrailingZeros ?? false;
  const sign = value < 0 && !options?.noNeg ? "-" : "";

  const plain = (n: number, decimals: number): string =>
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: keep ? decimals : 0,
      maximumFractionDigits: decimals,
    }).format(n);

  const intDigits = (n: number): number => Math.floor(n).toString().length;
  const suffixes = ["", "K", "M", "B", "T"];

  // Round for a value >= 1 according to the plan the budget dictates.
  const roundGE1 = (v: number): number => {
    if (v >= 1e15) return v;
    const n = intDigits(v);
    if (n <= maxDigits) return Number(v.toFixed(Math.max(maxDigits - n, 0)));
    const idx = Math.floor((n - 1) / 3);
    const scale = Math.pow(10, idx * 3);
    const mant = v / scale;
    const dec = Math.max(maxDigits - intDigits(mant), 0);
    return Number(mant.toFixed(dec)) * scale;
  };

  const renderGE1 = (v: number): string => {
    if (v >= 1e15) {
      const dec = Math.max(maxDigits - 1, 0);
      const [mant, exp] = v.toExponential(dec).split("e");
      return `${plain(Number(mant), dec)}e${Number(exp)}`;
    }
    const n = intDigits(v);
    if (n <= maxDigits) return plain(v, Math.max(maxDigits - n, 0));
    const idx = Math.floor((n - 1) / 3);
    const mant = v / Math.pow(10, idx * 3);
    const dec = Math.max(maxDigits - intDigits(mant), 0);
    return plain(mant, dec) + suffixes[idx];
  };

  // Rounding can push a value into the next digit count or suffix (999.996 ->
  // 1000), so round first and lay out the rounded value.
  const formatGE1 = (v: number): string => renderGE1(roundGE1(v));

  const formatLT1 = (v: number): string => {
    const zerosOf = (n: number): number =>
      -Number(n.toExponential().split("e")[1]) - 1;
    let z = zerosOf(v);

    if (z >= 4) {
      const sig = Math.max(maxDigits - 2, 2);
      // Round half-up on the decimal digits (binary floats would turn
      // 1.2345e-6 into 1.234e-6); 14 digits drops the representation noise.
      const [mant, expStr] = v.toExponential(14).split("e");
      const all = mant.replace(".", "");
      let rounded = BigInt(all.slice(0, sig));
      if (Number(all[sig]) >= 5) rounded += BigInt(1);
      let exp = Number(expStr);
      let digits = rounded.toString();
      if (digits.length > sig) {
        digits = digits.slice(0, sig);
        exp += 1;
      }
      z = -exp - 1;
      if (z >= 4) {
        if (!keep) digits = digits.replace(/0+$/, "") || "1";
        return `0.0${toSubscript(z)}${digits}`;
      }
      v = Number(`${digits[0]}.${digits.slice(1) || "0"}e${exp}`);
    }

    z = zerosOf(v);
    const sig = Math.max(maxDigits - 1 - z, 2);
    const dec = z + sig;
    const r = Number(v.toFixed(dec));
    if (r >= 1) return formatGE1(r);
    return plain(r, dec);
  };

  const abs = Math.abs(value);
  return sign + (abs >= 1 ? formatGE1(abs) : formatLT1(abs));
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
 * Converts a human-entered decimal string (e.g. "0.29") into its raw integer
 * amount for a token with the given decimals (e.g. 29n at 2 decimals).
 *
 * Operates on the string directly instead of `parseFloat(x) * 10 ** decimals`,
 * which loses precision to floating point (0.29 * 100 can come out as
 * 28.999999999999996, truncating to 28 instead of 29).
 *
 * Excess fraction digits beyond `decimals` are truncated, not rounded.
 * Empty or otherwise invalid input returns 0n.
 */
export const toRawAmount = (value: string, decimals: number): bigint => {
  const trimmed = value.trim();
  if (!/^-?\d*\.?\d*$/.test(trimmed) || !/\d/.test(trimmed)) {
    return BigInt(0);
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = "0", fraction = ""] = unsigned.split(".");

  const digits = `${whole || "0"}${fraction.slice(0, decimals).padEnd(decimals, "0")}`;
  const raw = BigInt(digits);
  return negative ? -raw : raw;
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
