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

/**
 * Amount of ERG reserved when the "Max" button fills an ERG deposit amount,
 * left over for the miner fee and the position box's minimum-ERG
 * requirements. See `CreatePositionCard`'s Max button.
 */
export const ERG_DEPOSIT_RESERVE_HUMAN = 0.01;

/**
 * Raw units of each deposited token the position box holds on top of the
 * reserve (a contract invariant), so a token deposit of `n` takes `n + 1`
 * from the wallet.
 */
export const CL_TOKEN_DUST_RAW = 1;

/**
 * ERG held by the position box and by the separate key box on top of the
 * reserve. Mirrors crux-boxes `FLOOR` and `SAFE_USER_MIN`; both are returned
 * to the user on withdraw.
 */
export const CL_POSITION_FLOOR_NANOERG = 1_000_000;
export const CL_KEY_BOX_NANOERG = 1_000_000;

/**
 * The amount fields show what leaves the wallet for that asset (excluding the
 * network fee and the ERG box minimums); the API takes the position's
 * reserve. A token's wallet amount is its reserve plus `CL_TOKEN_DUST_RAW`;
 * ERG's is the reserve itself.
 */
export function walletToReserveRaw(walletRaw: number, isErg: boolean): number {
  return isErg ? walletRaw : walletRaw - CL_TOKEN_DUST_RAW;
}

/** Inverse of `walletToReserveRaw`. */
export function reserveToWalletRaw(reserveRaw: number, isErg: boolean): number {
  return isErg ? reserveRaw : reserveRaw + CL_TOKEN_DUST_RAW;
}

/**
 * The largest human-unit amount the "Max" button should fill for a wallet
 * balance, given whether the deposit token is ERG. ERG holds back
 * `ERG_DEPOSIT_RESERVE_HUMAN` for the miner fee and box minimums; any other
 * token fills the whole balance. Never negative.
 */
export function computeMaxDepositHuman(balanceHuman: number, isErg: boolean): number {
  if (!Number.isFinite(balanceHuman)) return 0;
  return Math.max(isErg ? balanceHuman - ERG_DEPOSIT_RESERVE_HUMAN : balanceHuman, 0);
}

/** Whether a wallet amount (dust already included) exceeds the raw balance. */
export function exceedsWalletBalance(walletRaw: number, balanceRaw: number): boolean {
  return walletRaw > balanceRaw;
}

/** Strips trailing zeros (and a dangling "."), but only after a decimal point. */
export function trimDecimalZeros(text: string): string {
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

/**
 * Formats a human amount with at most `maxPlaces` decimal places (never more
 * than the token's `decimals`) and trailing zeros stripped, e.g.
 * `(90.283114619, 9)` -> `"90.283115"`.
 */
export function formatAmountTrimmed(human: number, decimals: number, maxPlaces = 6): string {
  if (!Number.isFinite(human)) return "0";
  return trimDecimalZeros(human.toFixed(Math.min(decimals, maxPlaces)));
}

/**
 * Formats a human-unit wallet balance for display in the token picker's
 * option labels and the deposit field's "Balance: ..." helper text.
 * Trims trailing zeros beyond 6 decimal places (e.g. 1.5, 1.500001, 0).
 */
export function formatWalletBalanceHuman(balanceHuman: number): string {
  if (!Number.isFinite(balanceHuman)) return "0";
  const fixed = Math.max(balanceHuman, 0).toFixed(6);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return trimmed === "" ? "0" : trimmed;
}

export interface WalletTokenOption {
  tokenId: string;
  name: string;
  decimals: number;
  /** Wallet balance for this token, in human units (already divided by
   * `10^decimals`). */
  balanceHuman: number;
}

/**
 * Formats a wallet-held token as a picker option label:
 * `"name — balance — shortId"`, e.g. `"SigUSD — 12.5 — 03faf...9a1c"`.
 */
export function formatTokenOptionLabel(option: WalletTokenOption): string {
  return `${option.name} — ${formatWalletBalanceHuman(option.balanceHuman)} — ${shortId(option.tokenId)}`;
}

/**
 * Converts a human limit-order price (Y per X, this page's convention) into
 * the raw `{numerator, denominator}` ratio ci-api's `/dex/limit_order`
 * expects, where `numerator/denominator` is the minimum raw taken units per
 * raw given unit: the on-chain condition is
 * `takenReceived * denominator >= givenSpent * numerator`.
 *
 * Mirrors `LimitOrderWidget`'s buy/sell price-ratio math (~lines 385-400),
 * generalized from ERG/base-token to an arbitrary X/Y pair. `numerator` is
 * always rounded up (ceil) so the counterparty pays at least the stated
 * price, never less.
 *
 * - sellX: give X, take Y. Rate is already Y per X, so numerator scales P
 *   into raw Y units and denominator is raw X's unit (10^decX).
 * - buyX: give Y, take X. Rate must be inverted to X per Y (1/P), scaled
 *   into raw X units, over raw Y's unit (10^decY).
 */
export function limitOrderPriceRatio(
  side: "sellX" | "buyX",
  priceYPerX: number,
  decX: number,
  decY: number,
): { numerator: number; denominator: number } {
  if (side === "sellX") {
    return {
      numerator: Math.ceil(priceYPerX * Math.pow(10, decY)),
      denominator: Math.pow(10, decX),
    };
  }
  return {
    numerator: Math.ceil((1 / priceYPerX) * Math.pow(10, decX)),
    denominator: Math.pow(10, decY),
  };
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
