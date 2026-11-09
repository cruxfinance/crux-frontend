import { ApiRequestError, ERG_TOKEN_ID } from "./clMath";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

/** One entry from Nautilus's `get_balance("all")`. */
export interface NautilusBalanceEntry {
  tokenId: string;
  balance: string | number;
}

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
    err.body = data;
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
