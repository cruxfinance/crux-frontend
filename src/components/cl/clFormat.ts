
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

/** Status label for a position row: retired positions are withdraw-only. */
export function clPositionStatusLabel(p: {
  withdraw_only: boolean;
  in_range: boolean;
}): "Withdraw only" | "In range" | "Out of range" {
  if (p.withdraw_only) return "Withdraw only";
  return p.in_range ? "In range" : "Out of range";
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

/**
 * Picks the ERG or USD figure for the portfolio's currency toggle
 * ("ERG" or "USE", where USE is dollar-pegged) and formats it.
 */
export function formatPortfolioValue(
  currency: "ERG" | "USE",
  erg: number | null | undefined,
  usd: number | null | undefined,
): string {
  return currency === "ERG"
    ? formatErgAmount(erg)
    : formatUsdAmount(usd, 2);
}

/**
 * USD estimate of an ERG-denominated amount using the position's own
 * value/value_usd ratio. Null when the ratio is unavailable.
 */
export function estimateUsdFromErg(
  erg: number | null | undefined,
  valueErg: number | null | undefined,
  valueUsd: number | null | undefined,
): number | null {
  if (erg === null || erg === undefined) return null;
  if (!valueErg || valueUsd === null || valueUsd === undefined) return null;
  return erg * (valueUsd / valueErg);
}
