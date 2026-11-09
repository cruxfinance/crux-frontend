import { useCallback, useRef, useState } from "react";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import type { ApiRequestError } from "./clMath";
import { apiJson, submitSignedTx } from "./walletTokens";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

/** Response of `POST /dex/cp/create`. */
export interface CpCreateResponse {
  mint_tx: object;
  create_tx: object;
  mint_tx_id: string;
  create_tx_id: string;
  pool_nft_id: string;
  lp_token_id: string;
  kind: "n2t" | "t2t";
  lp_tokens_received: number | string;
  fee_bps: number;
  pool_erg: number | string;
  locked_erg: number | string;
}

export interface CpCreateParams {
  tokenX: string;
  tokenY: string;
  amountX: bigint;
  amountY: bigint;
  feeBps: number;
}

export type CpCreateStage =
  | "idle"
  | "requesting"
  | "signing1"
  | "submitting1"
  | "signing2"
  | "submitting2"
  | "step2Failed"
  | "done";

export const MINT_CHANGED_MESSAGE =
  "Your wallet changed the first transaction, so the second one no longer matches. Nothing was sent.";

const PAUSED_MESSAGE = "Creating this kind of pool is paused right now.";

interface SignedTx {
  id?: string;
}

interface WalletContext {
  sign_tx: (tx: object) => Promise<SignedTx>;
  submit_tx: (tx: object) => Promise<string>;
}

function existingPoolId(error: unknown): string | null {
  const body = (error as ApiRequestError).body;
  if (body && typeof body === "object" && "pool_id" in body) {
    const id = (body as { pool_id: unknown }).pool_id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

/**
 * Creates a Crux pool in two chained transactions: mint the pool NFT, then
 * create the pool from it. The server builds both up front (the second spends
 * the first's outputs), so once the first is submitted the second can only be
 * retried, never rebuilt.
 */
export function useCpCreate(
  userAddresses: string[],
  options: { onExists?: (poolId: string) => void } = {},
) {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();
  const [stage, setStage] = useState<CpCreateStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CpCreateResponse | null>(null);
  // Mirrors `result` so a retry never reads a stale closure.
  const pending = useRef<CpCreateResponse | null>(null);
  const onExists = useRef(options.onExists);
  onExists.current = options.onExists;

  const submitMint = async (context: WalletContext, signed: SignedTx) => {
    // The backend leg is the one we wait for: the node that later receives the
    // second transaction should already hold the first. If only the wallet's
    // own route accepted it, the mint is broadcast all the same, so step 1 is
    // done; the second transaction can then be retried until our node has it.
    // Treating that case as a failure would have the user mint a second NFT.
    const wallet = context.submit_tx(signed).then(
      () => true,
      () => false,
    );
    try {
      await apiJson("/dex/submit_tx", signed);
    } catch (e) {
      if (await wallet) return;
      throw e;
    }
  };

  const runStep2 = async (response: CpCreateResponse) => {
    try {
      setStage("signing2");
      const context: WalletContext = await window.ergoConnector.nautilus.getContext();
      const signed = await context.sign_tx(response.create_tx);
      setStage("submitting2");
      await submitSignedTx(context, signed);
      setStage("done");
      setError(null);
      addAlert("success", `Pool created! TX: ${response.create_tx_id.slice(0, 8)}...`);
    } catch (e: any) {
      console.error("Create Crux pool, step 2:", e);
      setError(e?.message || "The second transaction failed");
      setStage("step2Failed");
    }
  };

  const start = useCallback(
    async (params: CpCreateParams) => {
      if (!window.ergoConnector?.nautilus) {
        addAlert("error", "Please connect Nautilus wallet");
        return;
      }
      if (userAddresses.length === 0) {
        addAlert("error", "No wallet addresses found");
        return;
      }
      const max = BigInt(Number.MAX_SAFE_INTEGER);
      if (params.amountX > max || params.amountY > max) {
        setError("Amount is too large");
        return;
      }
      setError(null);
      setStage("requesting");
      let response: CpCreateResponse;
      try {
        response = await apiJson<CpCreateResponse>("/dex/cp/create", {
          token_x: params.tokenX,
          token_y: params.tokenY,
          amount_x: Number(params.amountX),
          amount_y: Number(params.amountY),
          fee_bps: params.feeBps,
          user_addresses: userAddresses,
          miner_fee: minerFee,
        });
      } catch (e: any) {
        setStage("idle");
        const exists = e?.status === 409 ? existingPoolId(e) : null;
        if (exists) {
          onExists.current?.(exists);
          return;
        }
        setError(e?.status === 503 ? PAUSED_MESSAGE : e?.message || "Failed to build the transactions");
        return;
      }
      pending.current = response;
      setResult(response);

      try {
        setStage("signing1");
        const context: WalletContext = await window.ergoConnector.nautilus.getContext();
        const signed = await context.sign_tx(response.mint_tx);
        if (signed?.id && signed.id !== response.mint_tx_id) {
          throw new Error(MINT_CHANGED_MESSAGE);
        }
        setStage("submitting1");
        await submitMint(context, signed);
      } catch (e: any) {
        console.error("Create Crux pool, step 1:", e);
        pending.current = null;
        setResult(null);
        setError(e?.message || "The first transaction failed");
        setStage("idle");
        return;
      }
      await runStep2(response);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addAlert, minerFee, userAddresses],
  );

  /** Re-signs and re-submits the same second transaction. */
  const retryStep2 = useCallback(async () => {
    if (!pending.current) return;
    setError(null);
    await runStep2(pending.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Forgets the pending pair; the minted NFT stays in the wallet unused. */
  const reset = useCallback(() => {
    pending.current = null;
    setResult(null);
    setError(null);
    setStage("idle");
  }, []);

  const running = stage !== "idle" && stage !== "done" && stage !== "step2Failed";
  return { stage, running, error, result, start, retryStep2, reset };
}
