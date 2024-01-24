import { explorerApi, nodeApi } from "@server/services/axiosInstance";
import { Address, UnsignedTransaction } from "ergo-lib-wasm-nodejs";

const ERG = "erg";
const FEE = "1100000";
const FEE_ERGO_TREE =
  "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304";
const MIN_SAFE_ERG = "1000000";

const getCurrentChainHeight = async () => {
  const info = await nodeApi.get("/info");
  return info.data.fullHeight as number;
};

interface ExplorerAsset {
  tokenId: string;
  index: number;
  amount: number;
  name: string;
  decimals: number;
  type: "EIP-004";
}

interface ExplorerUnspentBox {
  id: string;
  txId: string;
  value: number;
  index: number;
  creationHeight: number;
  ergoTree: string;
  address: string;
  assets: ExplorerAsset[];
  additionalRegisters: any;
}

interface Input {
  boxId: string;
  transactionId: string;
  index: number;
  ergoTree: string;
  creationHeight: number;
  value: string;
  assets: { tokenId: string; amount: string | bigint }[];
  additionalRegisters: any;
}

interface Output {
  ergoTree: string;
  creationHeight: number;
  value: string;
  assets: { tokenId: string; amount: string | bigint }[];
  additionalRegisters: any;
}

interface TransferAmount {
  tokenId: string | null;
  amount: number;
}

const getUnspentBoxes = async (address: string) => {
  const boxes = await explorerApi.get(
    `/transactions/boxes/byAddress/unspent/${address}`
  );
  return boxes.data as ExplorerUnspentBox[];
};

export const getUnsignedTransaction = async (
  senderAddress: string,
  recipientAddress: string,
  transferAmount: TransferAmount
) => {
  const currentHeight = await getCurrentChainHeight();
  const inputs = (await getUnspentBoxes(senderAddress)).map((box) => {
    return {
      boxId: box.id,
      transactionId: box.txId,
      index: box.index,
      ergoTree: box.ergoTree,
      creationHeight: box.creationHeight,
      value: box.value.toString(),
      assets: box.assets.map((asset) => {
        return { ...asset, amount: asset.amount.toString() };
      }),
      additionalRegisters: box.additionalRegisters,
      extension: {},
    };
  });
  const outputs = [
    outputBox(recipientAddress, transferAmount, currentHeight),
    feeBox(currentHeight),
  ];
  const unsignedTransaction = {
    inputs,
    dataInputs: [],
    outputs: [
      ...outputs,
      changeBox(senderAddress, inputs, outputs, currentHeight),
    ],
  };
  const txId = UnsignedTransaction.from_json(
    JSON.stringify(unsignedTransaction)
  )
    .id()
    .to_str();
  return {
    id: txId,
    ...unsignedTransaction,
  };
};

const outputBox = (
  address: string,
  amount: TransferAmount,
  creationHeight: number
) => {
  const ergoTree = Address.from_mainnet_str(address)
    .to_ergo_tree()
    .to_base16_bytes();
  const value = amount.tokenId === null ? amount.amount : MIN_SAFE_ERG;
  return {
    value: value.toString(),
    ergoTree: ergoTree,
    creationHeight: creationHeight,
    assets:
      amount.tokenId === null
        ? []
        : [
            {
              tokenId: amount.tokenId,
              amount: amount.amount.toString(),
            },
          ],
    additionalRegisters: {},
  };
};

const feeBox = (creationHeight: number) => {
  return {
    value: FEE,
    ergoTree: FEE_ERGO_TREE,
    creationHeight: creationHeight,
    assets: [],
    additionalRegisters: {},
  };
};

const changeBox = (
  changeAddress: string,
  inputs: Input[],
  outputs: Output[],
  creationHeight: number
) => {
  const ergoTree = Address.from_mainnet_str(changeAddress)
    .to_ergo_tree()
    .to_base16_bytes();
  const diff = new Map<string, number>();
  inputs.forEach((input) => {
    diff.set(ERG, (diff.get(ERG) ?? 0) + Number(input.value));
    input.assets.forEach((asset) => {
      diff.set(
        asset.tokenId,
        (diff.get(asset.tokenId) ?? 0) + Number(asset.amount)
      );
    });
  });
  outputs.forEach((output) => {
    diff.set(ERG, (diff.get(ERG) ?? 0) - Number(output.value));
    output.assets.forEach((asset) => {
      diff.set(
        asset.tokenId,
        (diff.get(asset.tokenId) ?? 0) - Number(asset.amount)
      );
    });
  });
  Array.from(diff.entries()).forEach((entry) => {
    if (entry[1] < 0) {
      throw new Error(
        "Input boxes doesn't have enough assets for the transaction"
      );
    }
  });
  return {
    value: (diff.get(ERG) ?? 0).toString(),
    ergoTree: ergoTree,
    creationHeight: creationHeight,
    assets: Array.from(diff.entries())
      .filter((entry) => entry[0] !== ERG)
      .filter((entry) => entry[1] !== 0)
      .map((entry) => {
        return { tokenId: entry[0], amount: entry[1].toString() };
      }),
    additionalRegisters: {},
  };
};
