import { prisma } from "@server/prisma";
import { explorerApi, nodeApi } from "@server/services/axiosInstance";
import {
  Address,
  BlockHeaders,
  ErgoBoxes,
  ErgoStateContext,
  PreHeader,
  ReducedTransaction,
  UnsignedTransaction,
} from "ergo-lib-wasm-nodejs";
import { nanoid } from "nanoid";

const ERG = "erg";
const FEE = "1100000";
const FEE_ERGO_TREE =
  "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304";
const MIN_SAFE_ERG = "1000000";

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

interface PowSolutions {
  pk: string;
  w: string;
  n: string;
  d: string;
}

interface BlockHeader {
  id: string;
  parentId: string;
  version: number;
  timestamp: number;
  height: number;
  nBits: number;
  votes: string;
  stateRoot: string;
  adProofsRoot: string;
  transactionsRoot: string;
  extensionHash: string;
  powSolutions: PowSolutions;
}

const getCurrentChainHeight = async () => {
  const info = await nodeApi.get("/info");
  return info.data.headersHeight as number;
};

const getExplorerBlockHeaders = async () => {
  const headers = (
    await explorerApi.get(`/api/v1/blocks/headers`)
  ).data.items.slice(0, 10);
  return headers as BlockHeader[];
};

const getUnspentBoxes = async (address: string) => {
  const boxes = await explorerApi.get(
    `/transactions/boxes/byAddress/unspent/${address}`
  );
  return boxes.data as ExplorerUnspentBox[];
};

export const getUnsignedTransaction = async (
  senderAddress: string,
  recipientAddress: string,
  transferAmount: TransferAmount | TransferAmount[]
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
  const tx = UnsignedTransaction.from_json(JSON.stringify(unsignedTransaction));
  const reduced = await getTxReducedB64Safe(
    tx,
    ErgoBoxes.from_boxes_json(inputs),
    ErgoBoxes.from_boxes_json([])
  );
  const signingUrl = await getErgoPaySigningUrl(reduced);
  const txId = tx.id().to_str();
  return {
    id: txId,
    unsignedTransaction: {
      id: txId,
      ...unsignedTransaction,
    },
    reducedTransaction: signingUrl,
    rawReducedTx: reduced
  };
};

const outputBox = (
  address: string,
  amount: TransferAmount | TransferAmount[],
  creationHeight: number
) => {
  if (!Array.isArray(amount)) {
    amount = [amount];
  }
  const value =
    amount.filter((_amount) => _amount.tokenId === null || _amount.tokenId === "0000000000000000000000000000000000000000000000000000000000000000")[0]?.amount ??
    MIN_SAFE_ERG;
  const assets = amount
    .filter((_amount) => _amount.tokenId !== null && _amount.tokenId !== "0000000000000000000000000000000000000000000000000000000000000000")
    .map((_amount) => {
      return {
        tokenId: _amount.tokenId ?? "",
        amount: _amount.amount.toString(),
      };
    });
  const ergoTree = Address.from_mainnet_str(address)
    .to_ergo_tree()
    .to_base16_bytes();
  return {
    value: value.toString(),
    ergoTree: ergoTree,
    creationHeight: creationHeight,
    assets: [...assets],
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
        "The selected wallet doesn't have enough funds to cover the transaction"
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

const getErgoStateContext = async () => {
  const res = await getExplorerBlockHeaders();
  const block_headers = BlockHeaders.from_json(res);
  const pre_header = PreHeader.from_block_header(block_headers.get(0));
  return new ErgoStateContext(pre_header, block_headers);
};

const getTxReduced = async (
  unsignedTx: UnsignedTransaction,
  inputs: ErgoBoxes,
  dataInputs: ErgoBoxes
) => {
  const ctx = await getErgoStateContext();
  return ReducedTransaction.from_unsigned_tx(
    unsignedTx,
    inputs,
    dataInputs,
    ctx
  );
};

const getTxReducedB64Safe = async (
  unsignedTx: UnsignedTransaction,
  inputs: ErgoBoxes,
  dataInputs: ErgoBoxes
) => {
  const reduced = await getTxReduced(unsignedTx, inputs, dataInputs);
  const txReducedBase64 = btoa(
    String.fromCharCode(...reduced.sigma_serialize_bytes())
  );
  const ergoPayTx = txReducedBase64.replace(/\//g, "_").replace(/\+/g, "-");
  return ergoPayTx;
};

const getErgoPaySigningUrl = async (reducedTx: string) => {
  const id = nanoid();
  const oneHourFromNow: Date = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
  await prisma.keyValuePair.create({
    data: {
      key: id,
      value: reducedTx,
      expiresAt: oneHourFromNow
    },
  });
  return `${process.env.ERGOPAY_DOMAIN}/api/ergopay/${id}`;
};
