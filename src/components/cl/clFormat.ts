import { ERG_TOKEN_ID } from "./clMath";
import type { ClPair, ClPairStats } from "./clTypes";

/** Placeholder for a value the backend could not price. */
export const NO_VALUE = "—";

/**
 * Orders positions for display: in-range first (they earn fees), then by
 * ERG value descending. Stable for ties and does not mutate the input.
 */
export function sortPositionsInRangeFirst<
  T extends { in_range: boolean; erg_value: number },
>(positions: readonly T[]): T[] {
  return positions
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      if (a.p.in_range !== b.p.in_range) return a.p.in_range ? -1 : 1;
      const diff = (b.p.erg_value ?? 0) - (a.p.erg_value ?? 0);
      return diff !== 0 ? diff : a.i - b.i;
    })
    .map(({ p }) => p);
}

/** Orders pairs by TVL descending; unpriced pairs go last. */
export function sortPairsByTvl(pairs: readonly ClPairStats[]): ClPairStats[] {
  return [...pairs].sort(
    (a, b) => (b.tvl_erg ?? -Infinity) - (a.tvl_erg ?? -Infinity),
  );
}

/** APR as a percentage string from a fraction (0.12 -> "12.00%"). */
export function formatAprFraction(apr: number | null | undefined): string {
  if (apr === null || apr === undefined || !Number.isFinite(apr)) return NO_VALUE;
  const pct = apr * 100;
  if (pct >= 10000) return ">10,000%";
  return `${pct.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function fixed(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** "1,234.57 ERG", or the placeholder for null. Zero shows as "0.00 ERG". */
export function formatErgAmount(
  erg: number | null | undefined,
  decimals = 2,
): string {
  if (erg === null || erg === undefined || !Number.isFinite(erg)) return NO_VALUE;
  return `${fixed(erg, decimals)} ERG`;
}

/** "$1,234", or the placeholder for null. */
export function formatUsdAmount(
  usd: number | null | undefined,
  decimals = 0,
): string {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) return NO_VALUE;
  return `$${fixed(usd, decimals)}`;
}

/** Link to the CL page with a pair preselected. */
export function clPositionsHref(pair?: { token_x: string; token_y: string }): string {
  if (!pair) return "/cl-positions";
  const q = new URLSearchParams({ x: pair.token_x, y: pair.token_y });
  return `/cl-positions?${q.toString()}`;
}

function firstString(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/**
 * Reads `?x=<tokenId>&y=<tokenId>` (Next router query) into a pair. Needs
 * both sides; token Y may not be ERG by the CL convention.
 */
export function parsePreselectedPair(query: {
  x?: string | string[];
  y?: string | string[];
}): ClPair | null {
  const x = firstString(query.x);
  const y = firstString(query.y);
  if (!x || !y || y === ERG_TOKEN_ID) return null;
  return { tokenX: x, tokenY: y };
}
