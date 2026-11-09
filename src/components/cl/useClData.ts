import { useCallback, useEffect, useState } from "react";
import { isClNotDeployedError } from "./clMath";
import { apiJson } from "./walletTokens";
import type {
  ClPairStats,
  ClPairsResponse,
  ClPortfolioPosition,
  ClPortfolioResponse,
  ClPositionDto,
  ClPositionsResponse,
  ClTokenMeta,
} from "./clTypes";

/** Response of `GET /dex/cl/config` (see ci-api's `ClProtocolConfigDto`). */
export interface ClProtocolConfig {
  phi: number;
  floor_bps: number;
  ceil_bps: number;
  /** Null when the on-chain value is not representable. */
  ceil_bps_raw: number | null;
  cp_ceil_bps: number;
  cp_ceil_bps_raw: number | null;
  /** Upper bound the contract accepts for a ceiling (bps). */
  ceil_cap: number;
  phi_cap: number;
  receiver_address: string;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${process.env.CRUX_API}${path}`);
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // handled by the status check
  }
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data as T;
}

const PAIRS_REFRESH_MS = 60000;

/** CL pair stats. Failures leave `pairs` empty and set `error`; never throws. */
export function useClPairs() {
  const [pairs, setPairs] = useState<ClPairStats[]>([]);
  const [tokens, setTokens] = useState<Record<string, ClTokenMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await getJson<ClPairsResponse>("/dex/cl/pairs");
      setPairs(data.pairs || []);
      setTokens(data.tokens || {});
      setError(null);
    } catch (e: any) {
      console.error("Error fetching CL pairs:", e);
      setError(e?.message || "Failed to load concentrated liquidity pairs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const t = setInterval(reload, PAIRS_REFRESH_MS);
    return () => clearInterval(t);
  }, [reload]);

  return { pairs, tokens, loading, error, reload };
}

/** The user's priced CL positions (`POST /dex/cl/portfolio`). */
export function useClPortfolio(userAddresses: string[]) {
  const [positions, setPositions] = useState<ClPortfolioPosition[]>([]);
  const [tokens, setTokens] = useState<Record<string, ClTokenMeta>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = userAddresses.join(",");

  const reload = useCallback(async () => {
    if (userAddresses.length === 0) {
      setPositions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiJson<ClPortfolioResponse>("/dex/cl/portfolio", {
        user_addresses: userAddresses,
      });
      setPositions((data.positions || []).filter((p) => p.owned !== false));
      setTokens(data.tokens || {});
      setError(null);
    } catch (e: any) {
      console.error("Error fetching CL portfolio:", e);
      // CL not deployed on this network is not an error worth showing.
      setError(isClNotDeployedError(e) ? null : e?.message || "Failed to load");
      setPositions([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { positions, tokens, loading, error, reload };
}

/** All CL positions of one pair (for the liquidity histogram). */
export async function fetchPairPositions(
  tokenX: string,
  tokenY: string,
): Promise<ClPositionDto[]> {
  const data = await apiJson<ClPositionsResponse>("/dex/cl/positions", {
    user_addresses: [],
    token_x: tokenX,
    token_y: tokenY,
  });
  return data.positions || [];
}

export async function fetchClProtocolConfig(): Promise<ClProtocolConfig | null> {
  try {
    return await getJson<ClProtocolConfig>("/dex/cl/config");
  } catch {
    return null;
  }
}
