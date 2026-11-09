/**
 * Self-send of a CL position's key box, to reset its storage-rent age.
 * Withdraw and collect refuse a key box older than the storage period, so
 * LPs must move it before then. The key box is whatever wallet box holds the
 * position id token; it is re-created with the same script, tokens and
 * registers at the current height. Built client-side because it needs only
 * the wallet's own boxes (EIP-12 unsigned tx for Nautilus `sign_tx`).
 */

/** Standard mainnet miner-fee contract. */
export const MINER_FEE_ERGO_TREE =
  "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304";

/** Smallest value we are willing to leave in a re-created box (conservative). */
const MIN_BOX_VALUE = 1_000_000;

export interface Eip12Box {
  boxId: string;
  transactionId: string;
  index: number;
  value: string | number;
  ergoTree: string;
  assets: { tokenId: string; amount: string | number }[];
  additionalRegisters: Record<string, string>;
  creationHeight: number;
}

// ERG values are nanoERG (< 2^53), so plain numbers are exact; token amounts
// are passed through as strings.
const toStr = (n: number) => String(n);

/** Builds the unsigned self-send for the box holding `positionId`. Throws a
 * user-readable error when the wallet has no such box or cannot pay the fee. */
export function buildKeyBoxSelfSend(
  utxos: Eip12Box[],
  positionId: string,
  height: number,
  minerFee: number,
) {
  const fee = minerFee;
  const key = utxos.find((b) => b.assets.some((a) => a.tokenId === positionId));
  if (!key) throw new Error("Position key not found in the connected wallet");

  const keyValue = Number(key.value);
  const keyOut = {
    ergoTree: key.ergoTree,
    assets: key.assets.map((a) => ({ tokenId: a.tokenId, amount: String(a.amount) })),
    additionalRegisters: key.additionalRegisters,
    creationHeight: height,
  };
  const feeOut = {
    value: toStr(fee),
    ergoTree: MINER_FEE_ERGO_TREE,
    assets: [],
    additionalRegisters: {},
    creationHeight: height,
  };

  if (keyValue - fee >= MIN_BOX_VALUE) {
    return {
      inputs: [key],
      dataInputs: [],
      outputs: [{ ...keyOut, value: toStr(keyValue - fee) }, feeOut],
    };
  }

  // The key box is too small to pay the fee: add the wallet's largest other
  // box as a second input and return it as change.
  const extra = utxos
    .filter((b) => b.boxId !== key.boxId)
    .sort((a, b) => Number(b.value) - Number(a.value))[0];
  if (!extra || Number(extra.value) - fee < MIN_BOX_VALUE) {
    throw new Error("Not enough ERG in the wallet to pay the network fee");
  }
  return {
    inputs: [key, extra],
    dataInputs: [],
    outputs: [
      { ...keyOut, value: toStr(keyValue) },
      {
        ergoTree: extra.ergoTree,
        value: toStr(Number(extra.value) - fee),
        assets: extra.assets.map((a) => ({ tokenId: a.tokenId, amount: String(a.amount) })),
        additionalRegisters: extra.additionalRegisters,
        creationHeight: height,
      },
      feeOut,
    ],
  };
}
