import { bpsToPercentText } from "@components/cl/cpCreateMath";
import type { CruxCpPool } from "@components/cl/cpCreateMath";
import { trimDecimalZeros } from "@components/cl/clMath";
import type { PoolWithApr } from "./liquidityTypes";

export const POOL_TYPE_LABELS: Record<string, string> = {
  spectrum: "Spectrum",
  dexy: "Dexy",
  lithos: "Lithos",
  crux_cp: "ErgoDex",
};

export const CRUX_POOL_TYPE = "crux_cp";

export const supportsLiquidity = (poolType?: string) => poolType !== "lithos";

/** Venue name for a pool type; unknown types are capitalised. */
export function venueLabel(poolType: string): string {
  return (
    POOL_TYPE_LABELS[poolType] ?? poolType.charAt(0).toUpperCase() + poolType.slice(1)
  );
}

export interface PoolOption {
  poolId: string;
  label: string;
  /** Fee as percent text, e.g. "0.3". */
  feePercent: string;
  pool: PoolWithApr;
  disabled: boolean;
}

/**
 * Selector entries: the pair's pools, then fresh Crux pools the page's list
 * does not hold. A Crux pool's fee comes from `lp_fee_bps` when known, because
 * `fee_pct` in the page list is the rounded total fee.
 */
export function buildPoolOptions(
  pairPools: readonly PoolWithApr[],
  cruxPools: readonly CruxCpPool[],
): PoolOption[] {
  const fresh = new Map(cruxPools.map((p) => [p.pool_id, p]));
  const known = new Set(pairPools.map((p) => p.pool_id));
  const all: PoolWithApr[] = [
    ...pairPools,
    ...cruxPools.filter((p) => !known.has(p.pool_id)),
  ];
  return all.map((pool) => {
    const cp = fresh.get(pool.pool_id);
    const fee =
      cp !== undefined
        ? bpsToPercentText(cp.lp_fee_bps)
        : trimDecimalZeros(pool.fee_pct.toFixed(2));
    return {
      poolId: pool.pool_id,
      label: `${venueLabel(pool.pool_type)} · ${fee}%`,
      feePercent: fee,
      pool,
      disabled: !supportsLiquidity(pool.pool_type),
    };
  });
}
