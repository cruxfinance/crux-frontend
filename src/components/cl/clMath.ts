import { ERG_TOKEN_ID, ERG_DECIMALS } from "@lib/configs/paymentTokens";

/**
 * Pure raw<->human conversion helpers for the CL (concentrated liquidity)
 * proof-of-concept page. Kept free of React/fetch so it's trivially unit
 * testable.
 *
 * Conventions (see openspec/changes/cl-lp-poc/design.md "Conventions"):
 * - ERG is identified by `ERG_TOKEN_ID` (64 zero hex chars), same as
 *   crux-boxes, ci-api, and the rest of the frontend. Re-exported here so
 *   the CL components have one import path for CL-specific concerns.
 * - Price P is Y per X, in raw units (smallest unit of each token).
 *   Human price = raw price * 10^(decX - decY).
 * - fee_bps is basis points, e.g. 30 = 0.3%. Valid range: 0 <= fee_bps < 10000.
 */

export { ERG_TOKEN_ID, ERG_DECIMALS };

export function isErgTokenInput(input: string): boolean {
  const trimmed = input.trim();
  return trimmed === "" || trimmed.toUpperCase() === "ERG";
}

/**
 * Normalizes a user-typed token id field into the id the CL API expects.
 * Empty string or "ERG" (any case) becomes ERG_TOKEN_ID.
 * Anything else is returned trimmed, as-is.
 */
export function normalizeClTokenIdInput(input: string): string {
  return isErgTokenInput(input) ? ERG_TOKEN_ID : input.trim();
}

/** fee_bps must be a non-negative integer strictly less than 10000 (100%). */
export function isValidFeeBps(feeBps: number): boolean {
  return Number.isInteger(feeBps) && feeBps >= 0 && feeBps < 10000;
}

export function rawToHuman(raw: number, decimals: number): number {
  return raw / Math.pow(10, decimals);
}

export function humanToRaw(human: number, decimals: number): number {
  return Math.round(human * Math.pow(10, decimals));
}

/** raw price (Y per X, raw units) -> human price (Y per X, human units) */
export function rawPriceToHuman(
  rawPrice: number,
  decX: number,
  decY: number,
): number {
  return rawPrice * Math.pow(10, decX - decY);
}

/** human price (Y per X, human units) -> raw price (Y per X, raw units) */
export function humanPriceToRaw(
  humanPrice: number,
  decX: number,
  decY: number,
): number {
  return humanPrice * Math.pow(10, decY - decX);
}

export function feeBpsToPercent(feeBps: number): number {
  return feeBps / 100;
}

/** Shortens a hex id to `abc123…789xyz` for compact display. */
export function shortId(id: string, chars = 6): string {
  if (!id) return "";
  if (id.length <= chars * 2 + 1) return id;
  return `${id.slice(0, chars)}…${id.slice(-chars)}`;
}

/** Rounds to 2 decimals and drops a trailing ".00"/"0" (e.g. 5 -> "5",
 * 5.5 -> "5.5", 16.67 -> "16.67"). Internal formatting helper. */
function trimTrailingZeros(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Formats the protocol-fee rate formula for the page-level header line,
 * e.g. `formatProtocolFeeFormula(1667, 1)` ->
 * `"max(φ × LP fee, floor) = max(16.67% × LP fee, 1 bps)"`.
 * `phi` is parts of 10000 (see `/dex/cl/config`'s `phi`/`phi_raw`), `floorBps`
 * is already in basis points.
 */
export function formatProtocolFeeFormula(phi: number, floorBps: number): string {
  const phiPercent = trimTrailingZeros(phi / 100);
  return `max(φ × LP fee, floor) = max(${phiPercent}% × LP fee, ${floorBps} bps)`;
}

/** Formats an effective protocol-fee rate (bps of the net input, as
 * returned by `/dex/cl/positions` and `/dex/cl/preview`) for display. */
export function formatProtocolFeeBps(bps: number): string {
  return `${trimTrailingZeros(bps)} bps`;
}

/**
 * An error thrown by a component's `apiJson`/`apiGetJson` fetch helper,
 * carrying the HTTP status so callers can distinguish ci-api's CL-not-deployed
 * 503 from any other failure without depending on the exact message text.
 */
export interface ApiRequestError extends Error {
  status?: number;
}

/** Whether `error` is ci-api's "CL is not deployed on this network" 503
 * (`utilities::cl::cl_deployment_unavailable`) — checked by status code, set
 * by each component's fetch helper on every non-2xx response. */
export function isClNotDeployedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApiRequestError).status === 503
  );
}

export interface RangeSide {
  singleSided: boolean;
  /** which token the deposit is entirely denominated in, when single-sided */
  holdsOnly: "x" | "y" | null;
}

/**
 * Determines whether a range position is single-sided given the current
 * price and the range bounds, all in the same (raw or human, doesn't
 * matter as long as consistent) units.
 * Below price_lower the position holds only X; above price_upper only Y.
 */
export function classifyRangeSide(
  priceCurrent: number,
  priceLower: number,
  priceUpper: number,
): RangeSide {
  if (priceCurrent <= priceLower) {
    return { singleSided: true, holdsOnly: "x" };
  }
  if (priceCurrent >= priceUpper) {
    return { singleSided: true, holdsOnly: "y" };
  }
  return { singleSided: false, holdsOnly: null };
}
