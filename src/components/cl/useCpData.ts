import { useCallback, useEffect, useState } from "react";
import { getJson } from "./useClData";
import type { CpFeeTier, CruxCpPool } from "./cpCreateMath";

interface CpStatusResponse {
  tiers?: CpFeeTier[];
}

/** Creatable fee tiers from `GET /dex/cp/status`. `null` while loading,
 * empty when the endpoint failed (the form then cannot create). */
export function useCpTiers(): CpFeeTier[] | null {
  const [tiers, setTiers] = useState<CpFeeTier[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getJson<CpStatusResponse>("/dex/cp/status")
      .then((r) => !cancelled && setTiers(r.tiers ?? []))
      .catch(() => !cancelled && setTiers([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return tiers;
}

export async function fetchCruxPools(tokenA: string, tokenB: string): Promise<CruxCpPool[]> {
  const data = await getJson<{ pools?: CruxCpPool[] }>(
    `/dex/cp/pools?token_a=${tokenA}&token_b=${tokenB}`,
  );
  return data.pools ?? [];
}

/** The Crux pools of an unordered pair, read fresh (the page's pool list is
 * cached and capped). `reload` resolves with the new list. */
export function useCruxPools(tokenA: string, tokenB: string, enabled = true) {
  const [pools, setPools] = useState<CruxCpPool[]>([]);

  const reload = useCallback(async (): Promise<CruxCpPool[]> => {
    try {
      const next = await fetchCruxPools(tokenA, tokenB);
      setPools(next);
      return next;
    } catch (e) {
      console.error("Error fetching Crux pools:", e);
      return [];
    }
  }, [tokenA, tokenB]);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  return { pools, reload };
}
