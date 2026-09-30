import { useCallback, useState } from "react";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { isValidFeeBps, shortId } from "./clMath";
import { apiJson, submitSignedTx } from "./walletTokens";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

/** Response of `POST /dex/cl/preview`. */
export interface ClPreviewResponse {
  price_current: number;
  liquidity: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  reference_prices?: {
    spectrum?: number;
    cl_positions?: number;
  };
  /** Effective protocol-fee rate, bps of the net input. */
  protocol_fee_bps?: number;
}

interface CreateResponse {
  unsigned_tx: any;
  position_id: string;
}

export interface ClCreateResult {
  txId: string;
  positionId: string;
}

/**
 * Builds, signs and submits a CL position create transaction. `body` is the
 * preview body (see `buildClRequestBody`); this adds the user addresses, fee
 * tier and miner fee. Returns null on failure (an alert has been shown).
 */
export function useClCreate(userAddresses: string[]) {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();
  const [creating, setCreating] = useState(false);

  const create = useCallback(
    async (
      body: Record<string, unknown>,
      feeBps: number,
    ): Promise<ClCreateResult | null> => {
      if (!window.ergoConnector?.nautilus) {
        addAlert("error", "Please connect Nautilus wallet");
        return null;
      }
      if (userAddresses.length === 0) {
        addAlert("error", "No wallet addresses found");
        return null;
      }
      if (!isValidFeeBps(feeBps)) {
        addAlert("error", "Fee tier must be an integer between 0 and 9999 bps");
        return null;
      }
      setCreating(true);
      try {
        const result = await apiJson<CreateResponse>("/dex/cl/create", {
          ...body,
          user_addresses: userAddresses,
          fee_bps: feeBps,
          miner_fee: minerFee,
        });
        const context = await window.ergoConnector.nautilus.getContext();
        const signedTx = await context.sign_tx(result.unsigned_tx);
        const txId = await submitSignedTx(context, signedTx);
        addAlert(
          "success",
          `Position created! TX: ${txId.slice(0, 8)}... Position id: ${shortId(result.position_id)}`,
        );
        return { txId, positionId: result.position_id };
      } catch (error: any) {
        console.error("Create CL position error:", error);
        addAlert("error", error.message || "Failed to create position");
        return null;
      } finally {
        setCreating(false);
      }
    },
    [addAlert, minerFee, userAddresses],
  );

  return { create, creating };
}
