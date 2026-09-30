/** Depth-bar and share math for order book rows that mix CL and other liquidity. */

export interface DepthSegments {
  /** Width of the whole depth bar, 0..100. */
  totalPct: number;
  /** Width of the concentrated-liquidity segment (drawn from the edge), 0..totalPct. */
  clPct: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Split a cumulative depth bar into its total and concentrated-liquidity
 * parts. Both cumulatives share the same unit and `max` is the largest total
 * cumulative on either side of the book. Non-finite input yields an empty bar.
 */
export function depthSegments(
  cumulativeTotal: number,
  cumulativeCl: number,
  max: number,
): DepthSegments {
  if (!(max > 0) || !Number.isFinite(cumulativeTotal) || !Number.isFinite(cumulativeCl)) {
    return { totalPct: 0, clPct: 0 };
  }
  const totalPct = clamp((cumulativeTotal / max) * 100, 0, 100);
  const clPct = clamp((cumulativeCl / max) * 100, 0, totalPct);
  return { totalPct, clPct };
}

/** CL fraction (0..1) of a level's amount; 0 when the level is empty. */
export function clFraction(clAmount: number, amount: number): number {
  if (!(amount > 0) || !(clAmount > 0)) return 0;
  return Math.min(1, clAmount / amount);
}

/**
 * CSS background for a depth bar growing from the right edge: the CL segment
 * in a stronger tint of the side colour, the rest in the normal tint. `color`
 * is a `#rrggbb` string; the alpha suffixes are hex bytes.
 */
export function depthBackground(
  color: string,
  segments: DepthSegments,
  normalAlpha: string,
  clAlpha = "77",
): string {
  const { totalPct, clPct } = segments;
  if (clPct <= 0) {
    return `linear-gradient(to left, ${color}${normalAlpha} ${totalPct}%, transparent ${totalPct}%)`;
  }
  return (
    `linear-gradient(to left, ${color}${clAlpha} ${clPct}%, ` +
    `${color}${normalAlpha} ${clPct}%, ${color}${normalAlpha} ${totalPct}%, transparent ${totalPct}%)`
  );
}
