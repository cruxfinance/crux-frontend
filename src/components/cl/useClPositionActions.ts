import { useCallback, useState } from "react";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { apiJson, submitSignedTx } from "./walletTokens";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

/**
 * Collect / withdraw for owned CL positions: builds the unsigned tx via
 * ci-api, signs with Nautilus and submits. `busyId` is the position id
 * currently being processed.
 */
export function useClPositionActions(userAddresses: string[], onDone: () => void) {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = useCallback(
    async (
      endpoint: "/dex/cl/collect" | "/dex/cl/withdraw",
      positionId: string,
      successVerb: string,
    ): Promise<boolean> => {
      if (!window.ergoConnector?.nautilus) {
        addAlert("error", "Please connect Nautilus wallet");
        return false;
      }
      setBusyId(positionId);
      try {
        const result = await apiJson<{ unsigned_tx: any }>(endpoint, {
          position_id: positionId,
          user_addresses: userAddresses,
          miner_fee: minerFee,
        });
        const context = await window.ergoConnector.nautilus.getContext();
        const signedTx = await context.sign_tx(result.unsigned_tx);
        const txId = await submitSignedTx(context, signedTx);
        addAlert("success", `${successVerb}! TX: ${txId.slice(0, 8)}...`);
        onDone();
        return true;
      } catch (error: any) {
        console.error(`${successVerb} error:`, error);
        addAlert("error", error.message || `Failed: ${successVerb.toLowerCase()}`);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [addAlert, minerFee, onDone, userAddresses],
  );

  const collect = useCallback(
    (positionId: string) => run("/dex/cl/collect", positionId, "Fees collected"),
    [run],
  );
  const withdraw = useCallback(
    (positionId: string) => run("/dex/cl/withdraw", positionId, "Position withdrawn"),
    [run],
  );

  return { collect, withdraw, busyId };
}
