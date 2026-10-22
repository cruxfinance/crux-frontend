import { useCallback, useMemo, useState } from "react";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { buildKeyBoxSelfSend } from "./clKeyBox";
import { submitSignedTx } from "./walletTokens";

/** Signs and submits a self-send of a position's key box via Nautilus. */
export function useClKeyBoxRefresh(onDone: () => void) {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(
    async (positionId: string): Promise<boolean> => {
      if (!window.ergoConnector?.nautilus) {
        addAlert("error", "Please connect Nautilus wallet");
        return false;
      }
      setBusyId(positionId);
      try {
        const context = await window.ergoConnector.nautilus.getContext();
        const [utxos, height] = await Promise.all([
          context.get_utxos(),
          context.get_current_height(),
        ]);
        const unsigned = buildKeyBoxSelfSend(utxos || [], positionId, height, minerFee);
        const signed = await context.sign_tx(unsigned);
        const txId = await submitSignedTx(context, signed);
        addAlert("success", `Position key sent to yourself! TX: ${txId.slice(0, 8)}...`);
        onDone();
        return true;
      } catch (error: any) {
        console.error("Key box self-send error:", error);
        addAlert("error", error?.message || "Failed to send the position key");
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [addAlert, minerFee, onDone],
  );

  return useMemo(() => ({ refresh, busyId }), [refresh, busyId]);
}
