import { ERG_TOKEN_ID, humanPriceToRaw, humanToRaw, isValidFeePpm } from "./clMath";
import type { ClPairStats, ClTokenMeta } from "./clTypes";
import type { PoolWithApr } from "../liquidity/liquidityTypes";

/**
 * Pure helpers behind the liquidity page's merged pool/CL table and the
 * custom-range form's histogram and range handles. No React, no fetch.
 */

/* ------------------------------------------------------------------ */
/* Pool / CL pair merge                                               */
/* ------------------------------------------------------------------ */

/** Order-independent key for a token pair. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * CL orientation for a pair that has no CL pair to copy it from: ERG is
 * always X, otherwise the lexicographically smaller id is X.
 */
export function clOrientation(a: string, b: string): [x: string, y: string] {
  if (a === ERG_TOKEN_ID) return [a, b];
  if (b === ERG_TOKEN_ID) return [b, a];
  return a < b ? [a, b] : [b, a];
}

export interface VenueSplit {
  tvl_erg: number | null;
  volume_24h: number;
  apr: number | null;
}

export interface MergedPair {
  key: string;
  /** CL orientation: price is Y per X. */
  tokenX: string;
  tokenY: string;
  nameX: string;
  nameY: string;
  decimalsX: number;
  decimalsY: number;
  /** Display order ("left / right"): the pool's quote / base when a pool
   * exists (so ERG pairs read "TOKEN / ERG"), else Y / X. */
  leftId: string;
  rightId: string;
  /** Every Spectrum-style pool of the pair, largest TVL first. */
  pools: PoolWithApr[];
  /** Largest pool, used for the full-range Add flow. */
  pool: PoolWithApr | null;
  cl: ClPairStats | null;
  /** Null when no venue could price its TVL. */
  tvl_erg: number | null;
  volume_24h: number;
  /** Fee of the primary pool; CL fee tiers vary per position. */
  fee_pct: number | null;
  /** Percent, combined over venues weighted by TVL. */
  apr_7d: number | null;
  apr_30d: number | null;
  spectrum: VenueSplit | null;
  clSplit: VenueSplit | null;
}

/** TVL-weighted mean of `{tvl, apr}` entries, ignoring null APRs. */
export function combineApr(
  venues: ReadonlyArray<{ tvl: number | null; apr: number | null }>,
): number | null {
  const withApr = venues.filter(
    (v): v is { tvl: number | null; apr: number } =>
      v.apr !== null && Number.isFinite(v.apr),
  );
  if (withApr.length === 0) return null;
  const weight = withApr.reduce((s, v) => s + (v.tvl && v.tvl > 0 ? v.tvl : 0), 0);
  if (weight > 0) {
    return withApr.reduce((s, v) => s + v.apr * (v.tvl && v.tvl > 0 ? v.tvl : 0), 0) / weight;
  }
  return withApr.reduce((s, v) => s + v.apr, 0) / withApr.length;
}

/**
 * One row per token pair, merging Spectrum-style pools with CL pair stats.
 * Pairs held by only one venue still appear. APR is the TVL-weighted mean of
 * the venues' APRs, which equals combined fees over combined TVL.
 * `clTokens` supplies names/decimals for CL-only pairs.
 */
export function mergePoolsAndClPairs(
  pools: readonly PoolWithApr[],
  clPairs: readonly ClPairStats[],
  clTokens: Record<string, ClTokenMeta>,
): MergedPair[] {
  const byKey = new Map<
    string,
    { pools: PoolWithApr[]; cl: ClPairStats | null }
  >();
  for (const p of pools) {
    const k = pairKey(p.base_token_id, p.quote_token_id);
    const e = byKey.get(k) ?? { pools: [], cl: null };
    e.pools.push(p);
    byKey.set(k, e);
  }
  for (const c of clPairs) {
    const k = pairKey(c.token_x, c.token_y);
    const e = byKey.get(k) ?? { pools: [], cl: null };
    e.cl = c;
    byKey.set(k, e);
  }

  const out: MergedPair[] = [];
  byKey.forEach(({ pools: ps, cl }, key) => {
    const sorted = [...ps].sort((a, b) => b.tvl_erg - a.tvl_erg);
    const pool = sorted[0] ?? null;

    let tokenX: string;
    let tokenY: string;
    if (cl) {
      tokenX = cl.token_x;
      tokenY = cl.token_y;
    } else {
      [tokenX, tokenY] = clOrientation(pool!.base_token_id, pool!.quote_token_id);
    }

    const info = (id: string): { name: string; decimals: number } => {
      if (id === ERG_TOKEN_ID) return { name: "ERG", decimals: 9 };
      if (pool) {
        if (pool.base_token_id === id)
          return { name: pool.base_token_name, decimals: pool.base_token_decimals };
        if (pool.quote_token_id === id)
          return { name: pool.quote_token_name, decimals: pool.quote_token_decimals };
      }
      const m = clTokens[id];
      return m ?? { name: id.slice(0, 6), decimals: 0 };
    };
    const x = info(tokenX);
    const y = info(tokenY);

    const poolTvl = sorted.reduce((s, p) => s + p.tvl_erg, 0);
    const poolVol = sorted.reduce((s, p) => s + p.volume_24h, 0);
    const spectrum: VenueSplit | null = sorted.length
      ? {
          tvl_erg: poolTvl,
          volume_24h: poolVol,
          apr: combineApr(sorted.map((p) => ({ tvl: p.tvl_erg, apr: p.apr_7d }))),
        }
      : null;
    const clSplit: VenueSplit | null = cl
      ? {
          tvl_erg: cl.tvl_erg,
          volume_24h: cl.volume_24h_erg ?? 0,
          apr: cl.apr === null || cl.apr === undefined ? null : cl.apr * 100,
        }
      : null;

    const tvlKnown = (spectrum ? 1 : 0) + (cl && cl.tvl_erg !== null ? 1 : 0) > 0;
    const tvl = tvlKnown ? poolTvl + (cl?.tvl_erg ?? 0) : null;

    const combine = (poolApr: (p: PoolWithApr) => number | null) =>
      combineApr([
        ...sorted.map((p) => ({ tvl: p.tvl_erg, apr: poolApr(p) })),
        ...(clSplit ? [{ tvl: clSplit.tvl_erg, apr: clSplit.apr }] : []),
      ]);

    out.push({
      key,
      tokenX,
      tokenY,
      nameX: x.name,
      nameY: y.name,
      decimalsX: x.decimals,
      decimalsY: y.decimals,
      leftId: pool ? pool.quote_token_id : tokenY,
      rightId: pool ? pool.base_token_id : tokenX,
      pools: sorted,
      pool,
      cl,
      tvl_erg: tvl,
      volume_24h: poolVol + (clSplit?.volume_24h ?? 0),
      fee_pct: pool ? pool.fee_pct : null,
      apr_7d: combine((p) => p.apr_7d),
      apr_30d: combine((p) => p.apr_30d),
      spectrum,
      clSplit,
    });
  });
  return out;
}

export type MergedSortField = "tvl_erg" | "volume_24h" | "fee_pct" | "apr_7d" | "apr_30d";

/** Sorts by a numeric column; rows without a value go last in either direction. */
export function sortMergedPairs(
  pairs: readonly MergedPair[],
  field: MergedSortField,
  direction: "asc" | "desc",
): MergedPair[] {
  return pairs
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const av = a.p[field];
      const bv = b.p[field];
      const aNull = av === null || av === undefined || !Number.isFinite(av);
      const bNull = bv === null || bv === undefined || !Number.isFinite(bv);
      if (aNull || bNull) {
        if (aNull && bNull) return a.i - b.i;
        return aNull ? 1 : -1;
      }
      const diff = direction === "desc" ? bv! - av! : av! - bv!;
      return diff !== 0 ? diff : a.i - b.i;
    })
    .map(({ p }) => p);
}

/** Case-insensitive match of the query against token names and ids. */
export function filterMergedPairs(
  pairs: readonly MergedPair[],
  query: string,
): MergedPair[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...pairs];
  return pairs.filter(
    (p) =>
      p.nameX.toLowerCase().includes(q) ||
      p.nameY.toLowerCase().includes(q) ||
      `${p.nameX}/${p.nameY}`.toLowerCase().includes(q) ||
      `${p.nameY}/${p.nameX}`.toLowerCase().includes(q) ||
      p.tokenX.toLowerCase().startsWith(q) ||
      p.tokenY.toLowerCase().startsWith(q),
  );
}

/* ------------------------------------------------------------------ */
/* Price orientation, presets                                          */
/* ------------------------------------------------------------------ */

export interface PriceRange {
  min: number;
  max: number;
}

/** Inverts a Y-per-X range into an X-per-Y range (bounds swap). */
export function invertRange(r: PriceRange): PriceRange {
  return { min: 1 / r.max, max: 1 / r.min };
}

/** Range of +-`pct` percent around `price`, in the same orientation. */
export function presetRange(price: number, pct: number): PriceRange {
  return { min: price * (1 - pct / 100), max: price * (1 + pct / 100) };
}

export const RANGE_PRESETS_PCT = [2, 5, 10, 25] as const;

/** Uncollected/human helpers: raw CL price -> human price, in a chosen orientation. */
export function rawToDisplayPrice(
  raw: number,
  decX: number,
  decY: number,
  inverted: boolean,
): number {
  const human = raw * Math.pow(10, decX - decY);
  return inverted ? 1 / human : human;
}

/** Position bounds (raw Y per X) as a display-orientation range. */
export function positionDisplayRange(
  priceLowerRaw: number,
  priceUpperRaw: number,
  decX: number,
  decY: number,
  inverted: boolean,
): PriceRange {
  const a = rawToDisplayPrice(priceLowerRaw, decX, decY, inverted);
  const b = rawToDisplayPrice(priceUpperRaw, decX, decY, inverted);
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

/* ------------------------------------------------------------------ */
/* Histogram + pixel mapping (log price axis)                          */
/* ------------------------------------------------------------------ */

export interface LiquidityRange extends PriceRange {
  liquidity: number;
}

export interface LiquidityBucket {
  start: number;
  end: number;
  liquidity: number;
}

/**
 * Sums each range's liquidity over log-spaced price buckets between `dMin`
 * and `dMax`. A range contributes to a bucket when it covers the bucket's
 * geometric midpoint.
 */
export function bucketLiquidity(
  ranges: readonly LiquidityRange[],
  dMin: number,
  dMax: number,
  buckets: number,
): LiquidityBucket[] {
  if (!(dMin > 0) || !(dMax > dMin) || buckets < 1) return [];
  const lo = Math.log(dMin);
  const step = (Math.log(dMax) - lo) / buckets;
  const out: LiquidityBucket[] = [];
  for (let i = 0; i < buckets; i++) {
    const start = Math.exp(lo + step * i);
    const end = Math.exp(lo + step * (i + 1));
    const mid = Math.exp(lo + step * (i + 0.5));
    let liquidity = 0;
    for (const r of ranges) {
      if (r.liquidity > 0 && r.min <= mid && mid < r.max) liquidity += r.liquidity;
    }
    out.push({ start, end, liquidity });
  }
  return out;
}

/** Log-scale price -> x pixel. Not clamped. */
export function priceToX(price: number, dMin: number, dMax: number, width: number): number {
  const lo = Math.log(dMin);
  return ((Math.log(price) - lo) / (Math.log(dMax) - lo)) * width;
}

/** Inverse of `priceToX`. */
export function xToPrice(x: number, dMin: number, dMax: number, width: number): number {
  const lo = Math.log(dMin);
  return Math.exp(lo + (x / width) * (Math.log(dMax) - lo));
}

/**
 * Moves one handle to `price`, keeping it inside the domain and at least
 * `minGapRatio` (relative) away from the other handle.
 */
export function dragHandle(
  which: "min" | "max",
  price: number,
  range: PriceRange,
  dMin: number,
  dMax: number,
  minGapRatio = 0.001,
): PriceRange {
  if (which === "min") {
    const hi = range.max / (1 + minGapRatio);
    return { min: Math.min(Math.max(price, dMin), hi), max: range.max };
  }
  const lo = range.min * (1 + minGapRatio);
  return { min: range.min, max: Math.max(Math.min(price, dMax), lo) };
}

/**
 * Chart price domain: the current price and selection with headroom, plus
 * the existing positions' bounds clipped to a factor of the current price so
 * a single very wide position does not flatten the chart.
 */
export function computeDomain(
  current: number,
  selection: PriceRange | null,
  ranges: readonly PriceRange[],
  opts: { pad?: number; maxSpan?: number } = {},
): PriceRange {
  const pad = opts.pad ?? 1.35;
  const span = opts.maxSpan ?? 6;
  let lo = current / 1.6;
  let hi = current * 1.6;
  for (const r of ranges) {
    lo = Math.min(lo, Math.max(r.min, current / span));
    hi = Math.max(hi, Math.min(r.max, current * span));
  }
  if (selection && selection.min > 0 && selection.max > selection.min) {
    lo = Math.min(lo, selection.min);
    hi = Math.max(hi, selection.max);
  }
  return { min: lo / pad, max: hi * pad };
}

/** `n` roughly evenly spaced (log) axis tick prices, including the ends. */
export function axisTicks(dMin: number, dMax: number, n: number): number[] {
  if (n < 2) return [dMin];
  const lo = Math.log(dMin);
  const step = (Math.log(dMax) - lo) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.exp(lo + step * i));
}

/* ------------------------------------------------------------------ */
/* Value split                                                         */
/* ------------------------------------------------------------------ */

/**
 * Percentage of the deposit's ERG value held in X, from human amounts and
 * the price (Y per X, human). Null when the total is zero.
 */
export function valueSplitPct(
  amountX: number,
  amountY: number,
  priceYPerX: number,
): { xPct: number; yPct: number } | null {
  const xVal = amountX * priceYPerX; // in Y units
  const total = xVal + amountY;
  if (!(total > 0) || !Number.isFinite(total)) return null;
  const xPct = (xVal / total) * 100;
  return { xPct, yPct: 100 - xPct };
}

/* ------------------------------------------------------------------ */
/* Request body for /dex/cl/preview and /dex/cl/create                 */
/* ------------------------------------------------------------------ */

export interface ClRequestInput {
  tokenX: string;
  tokenY: string;
  decimalsX: number;
  decimalsY: number;
  /** Human prices, Y per X. */
  minPrice: number;
  maxPrice: number;
  /** Optional starting price for a pair with no market. */
  currentPrice?: number | null;
  side: "x" | "y";
  /** Human amount of the deposit-side token. */
  amount: number;
  feePpm: number;
}

/** Body shared by the preview and create endpoints, or null when the input is incomplete. */
export function buildClRequestBody(i: ClRequestInput): Record<string, unknown> | null {
  if (!(i.minPrice > 0) || !(i.maxPrice > i.minPrice) || !(i.amount > 0)) return null;
  const body: Record<string, unknown> = {
    token_x: i.tokenX,
    token_y: i.tokenY,
    price_lower: humanPriceToRaw(i.minPrice, i.decimalsX, i.decimalsY),
    price_upper: humanPriceToRaw(i.maxPrice, i.decimalsX, i.decimalsY),
  };
  if (i.currentPrice && i.currentPrice > 0) {
    body.price_current = humanPriceToRaw(i.currentPrice, i.decimalsX, i.decimalsY);
  }
  if (i.side === "x") body.amount_x = humanToRaw(i.amount, i.decimalsX);
  else body.amount_y = humanToRaw(i.amount, i.decimalsY);
  if (isValidFeePpm(i.feePpm)) body.fee_ppm = i.feePpm;
  return body;
}

/** Price with about four significant digits, thousands-separated above 1000. */
export function formatPriceCompact(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p === 0) return "0";
  const abs = Math.abs(p);
  if (abs >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (abs >= 1) return p.toLocaleString("en-US", { maximumFractionDigits: 4 });
  const decimals = Math.min(10, Math.max(4, 3 - Math.floor(Math.log10(abs))));
  return p.toFixed(decimals);
}

/* ------------------------------------------------------------------ */
/* Compact range bar                                                   */
/* ------------------------------------------------------------------ */

export interface RangeBarLayout {
  /** Percent positions along the track, 0..100. */
  startPct: number;
  endPct: number;
  markerPct: number;
}

/**
 * Lays a position's [lower, upper] range and the current price out on a
 * log-scale track that shows the range with a margin on both sides and
 * always includes the current price.
 */
export function rangeBarLayout(
  lower: number,
  upper: number,
  current: number,
  margin = 0.5,
): RangeBarLayout {
  const lo = Math.log(lower);
  const hi = Math.log(upper);
  const cur = Math.log(current);
  const span = Math.max(hi - lo, 1e-9);
  const dLo = Math.min(lo - span * margin, cur - span * 0.1);
  const dHi = Math.max(hi + span * margin, cur + span * 0.1);
  const pct = (v: number) => ((v - dLo) / (dHi - dLo)) * 100;
  return { startPct: pct(lo), endPct: pct(hi), markerPct: pct(cur) };
}
