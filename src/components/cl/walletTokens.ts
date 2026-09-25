import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  ERG_DECIMALS,
  ERG_TOKEN_ID,
  formatWalletBalanceHuman,
  isErgTokenInput,
  rawToHuman,
  shortId,
} from "./clMath";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

/** Token id + resolved name/decimals, from `/crux/token_info/:id` or the
 * ERG constant. */
export interface ResolvedToken {
  tokenId: string;
  name: string;
  decimals: number;
}

/** One entry from Nautilus's `get_balance("all")`. */
export interface NautilusBalanceEntry {
  tokenId: string;
  balance: string | number;
}

/** Module-level cache for `/crux/token_info/:id` lookups. Token name and
 * decimals don't change, so this is shared across resolutions -- both the
 * typed-input resolvers below and the wallet-asset dropdown, which may look
 * up the same ids repeatedly as balances refresh. */
export const tokenInfoCache = new Map<string, ResolvedToken>();

/** POSTs `body` to `${CRUX_API}${path}` and returns the parsed JSON, or
 * throws an `ApiRequestError` (carrying the HTTP status) on a non-2xx
 * response or a `{error}` body. */
export async function apiJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${process.env.CRUX_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON body, fall through to status-based error below
  }
  if (!response.ok) {
    const err: ApiRequestError = new Error(data?.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  if (data?.error) {
    const err: ApiRequestError = new Error(data.error);
    err.status = response.status;
    throw err;
  }
  return data as T;
}

/** Submits a signed tx to Nautilus and our backend concurrently -- our node
 * can learn about a Nautilus-submitted tx minutes late, so the next tx
 * ci-api builds can reuse boxes the wallet already spent. Resolves with the
 * tx id as soon as either submission succeeds (same id either way); only
 * rejects -- with Nautilus's error, so existing error handling is unchanged
 * -- if both fail. The backend leg is best-effort: a failure there is just
 * warned. */
export async function submitSignedTx(
  context: { submit_tx: (signedTx: object) => Promise<string> },
  signedTx: object,
): Promise<string> {
  const nautilus = context.submit_tx(signedTx);
  const backend = apiJson<{ tx_id: string }>("/dex/submit_tx", signedTx).then((r) => r.tx_id);

  return new Promise<string>((resolve, reject) => {
    let nautilusFailed = false;
    let backendFailed = false;
    let nautilusError: unknown;

    nautilus.then(resolve, (error) => {
      nautilusError = error;
      nautilusFailed = true;
      if (backendFailed) reject(nautilusError);
    });

    backend.then(resolve, (error) => {
      console.warn("Backend tx submission failed:", error);
      backendFailed = true;
      if (nautilusFailed) reject(nautilusError);
    });
  });
}

/** Resolves a user-typed token id field into name + decimals. Returns null
 * for blank/unresolvable input, and the ERG constant directly for ERG. */
export async function resolveToken(
  input: string,
  allowErg: boolean,
): Promise<ResolvedToken | null> {
  if (allowErg && isErgTokenInput(input)) {
    return { tokenId: ERG_TOKEN_ID, name: "ERG", decimals: ERG_DECIMALS };
  }
  const id = input.trim();
  if (!id) return null;
  return resolveTokenById(id);
}

/** Resolves a known token id (not a user-typed field -- no ERG/blank
 * handling) into name + decimals, via the shared cache. */
export async function resolveTokenById(id: string): Promise<ResolvedToken | null> {
  if (id === ERG_TOKEN_ID) {
    return { tokenId: ERG_TOKEN_ID, name: "ERG", decimals: ERG_DECIMALS };
  }
  const cached = tokenInfoCache.get(id);
  if (cached) return cached;
  try {
    const response = await fetch(`${process.env.CRUX_API}/crux/token_info/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.token_name) return null;
    const resolved: ResolvedToken = { tokenId: id, name: data.token_name, decimals: data.decimals ?? 0 };
    tokenInfoCache.set(id, resolved);
    return resolved;
  } catch {
    return null;
  }
}

/** Fetches every asset balance from the connected Nautilus wallet. Returns
 * `null` if Nautilus isn't available or the call fails. ERG is reported by
 * Nautilus under the literal tokenId `"ERG"`; this normalizes it to the
 * app's `ERG_TOKEN_ID` so it keys the same map as every other lookup here. */
export async function fetchWalletBalances(): Promise<Map<string, number> | null> {
  if (!window.ergoConnector?.nautilus) return null;
  try {
    const context = await window.ergoConnector.nautilus.getContext();
    const entries: NautilusBalanceEntry[] = await context.get_balance("all");
    const balances = new Map<string, number>();
    for (const entry of entries || []) {
      const tokenId = entry.tokenId === "ERG" ? ERG_TOKEN_ID : entry.tokenId;
      const amount =
        typeof entry.balance === "string" ? parseInt(entry.balance, 10) : entry.balance;
      if (Number.isFinite(amount)) balances.set(tokenId, amount);
    }
    return balances;
  } catch (error) {
    console.error("Error fetching wallet balances:", error);
    return null;
  }
}

/**
 * Wallet-held token balances plus resolved name/decimals, for the Token X/Y
 * dropdowns shared by `CreatePositionCard` and `LimitOrderCard`. Reloads on
 * wallet connect and whenever `refreshTrigger` changes (the page bumps it
 * after a successful create or dev-mint).
 */
export function useWalletTokens(walletConnected: boolean, refreshTrigger?: number) {
  // Keyed by ERG_TOKEN_ID/tokenId -> raw (smallest-unit) balance.
  const [walletBalances, setWalletBalances] = useState<Map<string, number>>(new Map());
  const [walletTokenMeta, setWalletTokenMeta] = useState<Record<string, ResolvedToken>>({});

  // Load wallet balances when the wallet connects, and refresh after a
  // successful create or dev-mint (the page bumps `refreshTrigger`).
  useEffect(() => {
    if (!walletConnected) {
      setWalletBalances(new Map());
      return;
    }
    let cancelled = false;
    fetchWalletBalances().then((balances) => {
      if (!cancelled && balances) setWalletBalances(balances);
    });
    return () => {
      cancelled = true;
    };
  }, [walletConnected, refreshTrigger]);

  // Resolve name + decimals for every wallet-held token, so the dropdowns
  // can show names/balances instead of bare ids. Cached in resolveTokenById.
  useEffect(() => {
    let cancelled = false;
    const ids = Array.from(walletBalances.keys());
    (async () => {
      const resolved = await Promise.all(ids.map((id) => resolveTokenById(id)));
      if (cancelled) return;
      setWalletTokenMeta((prev) => {
        const next = { ...prev };
        ids.forEach((id, i) => {
          const meta = resolved[i];
          if (meta) next[id] = meta;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [walletBalances]);

  /** Friendly "name — balance — shortId" label for a wallet dropdown row. */
  const optionLabelFor = useCallback(
    (tokenId: string): string => {
      const meta =
        tokenId === ERG_TOKEN_ID
          ? { name: "ERG", decimals: ERG_DECIMALS }
          : walletTokenMeta[tokenId];
      const decimals = meta?.decimals ?? 0;
      const name = meta?.name ?? shortId(tokenId, 4);
      const balanceRaw = walletBalances.get(tokenId) ?? 0;
      return `${name} — ${formatWalletBalanceHuman(rawToHuman(balanceRaw, decimals))} — ${shortId(tokenId)}`;
    },
    [walletBalances, walletTokenMeta],
  );

  /** Filters dropdown options by id or token name as the user types --
   * `getOptionLabel` below returns the raw id/"ERG", not the friendly
   * label, so the default label-based filtering wouldn't match on name. */
  const filterWalletOptions = useCallback(
    (options: string[], state: { inputValue: string }) => {
      const q = state.inputValue.trim().toLowerCase();
      if (!q) return options;
      return options.filter((id) => {
        const name = id === ERG_TOKEN_ID ? "ERG" : walletTokenMeta[id]?.name || "";
        return id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      });
    },
    [walletTokenMeta],
  );

  return { walletBalances, walletTokenMeta, optionLabelFor, filterWalletOptions };
}

/** Wallet token ids available for a Token X/Y dropdown, restricted to ids
 * whose name/decimals resolved. ERG is always offered for the X side; the Y
 * side never offers ERG, matching the typed-input convention (Y is never
 * ERG). Shared by `CreatePositionCard` and `LimitOrderCard`. */
export function walletTokenIdsForSide(
  walletBalances: Map<string, number>,
  walletTokenMeta: Record<string, ResolvedToken>,
  side: "x" | "y",
): string[] {
  if (side === "x") {
    const ids = new Set<string>([ERG_TOKEN_ID]);
    walletBalances.forEach((amount, id) => {
      if (amount > 0) ids.add(id);
    });
    return Array.from(ids).filter((id) => id === ERG_TOKEN_ID || walletTokenMeta[id]);
  }
  const ids: string[] = [];
  walletBalances.forEach((amount, id) => {
    if (amount > 0 && id !== ERG_TOKEN_ID && walletTokenMeta[id]) ids.push(id);
  });
  return ids;
}
