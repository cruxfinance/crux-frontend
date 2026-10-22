import { useEffect, useState } from "react";
import { mapClStatus } from "./clStatus";
import type { ClStatusResponse, ClStatusView } from "./clStatus";

const CACHE_MS = 15000;

let cached: { at: number; view: ClStatusView } | null = null;
let inflight: Promise<ClStatusView> | null = null;

/** Fetches `/dex/cl/status` with a 15 s shared cache. Never throws: any
 * error or non-2xx (including 503 when CL is not deployed) maps to
 * "unavailable". */
export function fetchClStatus(): Promise<ClStatusView> {
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.view);
  if (inflight) return inflight;
  inflight = (async () => {
    let raw: ClStatusResponse | null = null;
    try {
      const response = await fetch(`${process.env.CRUX_API}/dex/cl/status`);
      if (response.ok) raw = (await response.json()) as ClStatusResponse;
    } catch {
      raw = null;
    }
    const view = mapClStatus(raw);
    cached = { at: Date.now(), view };
    inflight = null;
    return view;
  })();
  return inflight;
}

/** Test hook: forget the cached status. */
export function resetClStatusCache() {
  cached = null;
  inflight = null;
}

/** Current CL status; `null` until the first response. Refreshes every 15 s. */
export function useClStatus(): ClStatusView | null {
  const [view, setView] = useState<ClStatusView | null>(cached?.view ?? null);
  useEffect(() => {
    let cancelled = false;
    const load = () => fetchClStatus().then((v) => !cancelled && setView(v));
    load();
    const t = setInterval(load, CACHE_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  return view;
}
