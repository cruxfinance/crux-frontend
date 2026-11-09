import { toRawAmount } from "@lib/utils/general";
import { ERG_TOKEN_ID, trimDecimalZeros } from "./clMath";
import type { PoolWithApr } from "../liquidity/liquidityTypes";

/**
 * Pure helpers behind the "New Crux pool" form. Raw amounts are BigInt
 * because the product of two token amounts easily passes 2^53.
 */

/** Storage-rent floor inside an ERG pool's reserve, nanoERG. Preview text only. */
export const CP_N2T_LOCKED_NANOERG = BigInt(2_400_000_000);
/** ERG a token/token pool locks on top of the reserves, nanoERG. Preview text only. */
export const CP_T2T_LOCKED_NANOERG = BigInt(2_600_000_000);
/** ERG the Max button leaves behind for the two miner fees and change. */
export const CP_ERG_FEE_RESERVE_NANOERG = BigInt(20_000_000);
/** Opening-price gap above which the form warns, as a fraction. */
export const CP_PRICE_WARN_FRACTION = 0.02;

/** Creatable tier from `GET /dex/cp/status`. */
export interface CpFeeTier {
  fee_bps: number;
  lp_fee_pct: number;
  protocol_fee_pct: number | null;
}

/** Row of `GET /dex/cp/pools`. */
export type CruxCpPool = PoolWithApr & { lp_fee_bps: number; kind: "n2t" | "t2t" };

/** Floor of the integer square root. */
export function bigIntSqrt(n: bigint): bigint {
  if (n < BigInt(0)) throw new RangeError("sqrt of a negative number");
  if (n < BigInt(2)) return n;
  // Newton from an upper bound; strictly decreasing until it reaches floor(sqrt(n)).
  let x = BigInt(1) << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const y = (x + n / x) >> BigInt(1);
    if (y >= x) return x;
    x = y;
  }
}

/** LP shares the creator receives: floor(sqrt(x * y)), raw units. */
export function lpTokensPreview(amountX: bigint, amountY: bigint): bigint {
  if (amountX <= BigInt(0) || amountY <= BigInt(0)) return BigInt(0);
  return bigIntSqrt(amountX * amountY);
}

/** Exact decimal text of a raw amount, trailing zeros trimmed ("1.5"). */
export function rawToText(raw: bigint, decimals: number): string {
  const negative = raw < BigInt(0);
  const digits = (negative ? -raw : raw).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const frac = digits.slice(digits.length - decimals);
  const text = decimals > 0 ? trimDecimalZeros(`${whole}.${frac}`) : whole;
  return negative ? `-${text}` : text;
}

/** Parses typed input into raw units; 0n for empty or malformed text. */
export function parseRaw(text: string, decimals: number): bigint {
  const raw = toRawAmount(text, decimals);
  return raw > BigInt(0) ? raw : BigInt(0);
}

export function rawToNumber(raw: bigint, decimals: number): number {
  return Number(raw) / Math.pow(10, decimals);
}

/** Percent text for a fee in bps: 5 -> "0.05", 30 -> "0.3", 150 -> "1.5". */
export function bpsToPercentText(bps: number): string {
  return trimDecimalZeros((bps / 100).toFixed(2));
}

/** Price of 1 `leftId` in the other token, from a pool's reserves (human units). */
export function poolPriceRightPerLeft(pool: PoolWithApr, leftId: string): number | null {
  if (!(pool.base_amount > 0) || !(pool.quote_amount > 0)) return null;
  const base = pool.base_amount / Math.pow(10, pool.base_token_decimals);
  const quote = pool.quote_amount / Math.pow(10, pool.quote_token_decimals);
  return pool.base_token_id === leftId ? quote / base : base / quote;
}

/** CL price (Y per X, human) expressed as right-per-left. */
export function clPriceRightPerLeft(
  priceYPerX: number | null,
  leftId: string,
  tokenX: string,
): number | null {
  if (priceYPerX === null || !(priceYPerX > 0)) return null;
  return leftId === tokenX ? priceYPerX : 1 / priceYPerX;
}

/** Relative difference `(opening - market) / market`; null without a market price. */
export function priceDifference(opening: number, market: number | null): number | null {
  if (market === null || !(market > 0) || !(opening > 0)) return null;
  return (opening - market) / market;
}

export type CpKind = "n2t" | "t2t";

export function cpKindFor(tokenX: string, tokenY: string): CpKind {
  return tokenX === ERG_TOKEN_ID || tokenY === ERG_TOKEN_ID ? "n2t" : "t2t";
}
