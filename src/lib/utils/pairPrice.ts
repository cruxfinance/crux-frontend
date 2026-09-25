import { ERG_TOKEN_ID } from "@lib/configs/paymentTokens";

export type OrderSide = "buy" | "sell";

/**
 * Fields needed to classify an order's side. The backend represents ERG as
 * `given_token_id: null`, so that must be normalized to ERG_TOKEN_ID before
 * comparing against the pair's quote token.
 */
export interface OrderSideFields {
  given_token_id: string | null;
}

/**
 * Fields needed to compute an order's display price, in quote-per-base terms.
 */
export interface OrderPriceFields {
  price_numerator: number;
  price_denominator: number;
  given_token_decimals: number | null;
  taken_token_decimals: number | null;
}

/**
 * An order is a "buy" when it gives away the quote token to receive the base
 * token, and a "sell" otherwise. This holds regardless of which side of the
 * pair (base or quote) ERG happens to be on.
 */
export function getOrderSide(
  order: OrderSideFields,
  quoteTokenId: string,
): OrderSide {
  const givenTokenId = order.given_token_id ?? ERG_TOKEN_ID;
  return givenTokenId === quoteTokenId ? "buy" : "sell";
}

/**
 * Computes an order's price in quote-per-base terms, matching the ratio the
 * user entered when placing the order (see LimitOrderWidget's priceNumerator
 * / priceDenominator derivation).
 */
export function getOrderPrice(
  order: OrderPriceFields,
  side: OrderSide,
): number {
  if (order.price_denominator === 0) return 0;

  const rawRatio = order.price_numerator / order.price_denominator;
  const givenDecimals = order.given_token_decimals ?? 9;
  const takenDecimals = order.taken_token_decimals ?? 9;
  const adjustedPrice = rawRatio * Math.pow(10, givenDecimals - takenDecimals);

  return side === "buy" ? 1 / adjustedPrice : adjustedPrice;
}

export interface LimitOrderPriceRatio {
  priceNumerator: number;
  priceDenominator: number;
}

// Target significant digits for the numerator, and the cap on how far either
// exponent (decimals + extra scale) may grow. 15 keeps both results well
// inside Number.MAX_SAFE_INTEGER (~9.007e15) and a signed 64-bit Long.
const MIN_SIGNIFICANT_DIGITS = 8;
const MAX_EXPONENT = 15;

/**
 * Computes price_numerator/price_denominator for a new limit order at a
 * given human price (see LimitOrderWidget submit handler).
 *
 * The naive formula — numerator = ceil(rate * 10^takenDecimals), denominator
 * = 10^givenDecimals — gives the numerator only as many significant digits
 * as takenDecimals provides. For a low- or 0-decimal taken token that
 * collapses to a handful of representable prices (e.g. buying a 0-decimal
 * token at 0.3 ERG rounds to 0.25 ERG, ~17% off).
 *
 * Scaling both numerator and denominator up by the same extra power of ten
 * adds precision without changing the ratio; the scale is capped so both
 * results stay exact, safe integers. Keeps ceil() rounding (deliberate — see
 * commit 93490eb): the counterparty always receives at least what the
 * entered price implies.
 */
export function calculateLimitOrderPriceRatio(
  priceFloat: number,
  side: OrderSide,
  givenDecimals: number,
  takenDecimals: number,
): LimitOrderPriceRatio {
  const rate = side === "buy" ? 1 / priceFloat : priceFloat;

  const naiveNumerator = rate * Math.pow(10, takenDecimals);
  const currentDigits =
    naiveNumerator > 0 ? Math.floor(Math.log10(naiveNumerator)) + 1 : 1;
  const desiredExtraDigits = Math.max(
    0,
    MIN_SIGNIFICANT_DIGITS - currentDigits,
  );
  const extraDigits = Math.max(
    0,
    Math.min(
      desiredExtraDigits,
      MAX_EXPONENT - givenDecimals,
      MAX_EXPONENT - takenDecimals,
    ),
  );

  const scaledNumerator = BigInt(
    Math.ceil(rate * Math.pow(10, takenDecimals + extraDigits)),
  );
  const scaledDenominator = BigInt(10) ** BigInt(givenDecimals + extraDigits);
  const divisor = gcdBigInt(scaledNumerator, scaledDenominator);

  return {
    priceNumerator: Number(scaledNumerator / divisor),
    priceDenominator: Number(scaledDenominator / divisor),
  };
}

function gcdBigInt(a: bigint, b: bigint): bigint {
  let x = a < BigInt(0) ? -a : a;
  let y = b < BigInt(0) ? -b : b;
  while (y > BigInt(0)) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x === BigInt(0) ? BigInt(1) : x;
}
