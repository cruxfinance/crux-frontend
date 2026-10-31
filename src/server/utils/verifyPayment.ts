import { ERG_TOKEN_ID_MAP } from "@lib/configs/paymentTokens";
import { prisma } from "@server/prisma";
import { explorerApi } from "@server/services/axiosInstance";
import {
  acquireTransactionalLock,
  releaseTransactionalLock,
} from "@server/services/subscription/transactionLock";
import { z } from "zod";

// Lowercase only: Transaction.id is a case-sensitive key, so case variants of
// one tx must not become distinct ids.
export const TX_ID_REGEX = /^[0-9a-f]{64}$/;
export const txIdSchema = z.string().regex(TX_ID_REGEX);

const INTENT_TTL = 60 * 60 * 1000; // 1 hour
const EXPLORER_TIMEOUT = 10 * 1000; // callers hold the instrument lock

const intentKey = (txId: string) => `payment-intent-${txId}`;

// First writer wins: a later builder must not take over the intent.
export const recordPaymentIntent = async (txId: string, userId: string) => {
  await prisma.keyValuePair.upsert({
    where: { key: intentKey(txId) },
    create: {
      key: intentKey(txId),
      value: userId,
      expiresAt: new Date(Date.now() + INTENT_TTL),
    },
    update: {},
  });
};

export const assertPaymentIntent = async (txId: string, userId: string) => {
  const intent = await prisma.keyValuePair.findFirst({
    where: { key: intentKey(txId) },
  });
  if (
    intent === null ||
    intent.value !== userId ||
    (intent.expiresAt !== null && intent.expiresAt.getTime() < Date.now())
  ) {
    throw new Error(`Transaction ${txId} was not built for this user.`);
  }
};

const toBigInt = (n: unknown): bigint | null =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? BigInt(n) : null;

/**
 * Amount paid to ADMIN_ADDRESS by a confirmed tx, in base units of tokenId
 * (null = ERG). Returns null when the tx cannot be verified yet.
 */
export const getPaidAmount = async (
  txId: string,
  tokenId: string | null
): Promise<bigint | null> => {
  if (!TX_ID_REGEX.test(txId)) {
    throw new Error(`Invalid transaction id.`);
  }
  const recipient = process.env.ADMIN_ADDRESS ?? "";
  if (recipient === "") {
    throw new Error("ADMIN_ADDRESS is not configured.");
  }

  let tx: any;
  try {
    const res = await explorerApi.get(`/api/v1/transactions/${txId}`, {
      timeout: EXPLORER_TIMEOUT,
    });
    tx = res.data;
  } catch (e) {
    console.warn(`Explorer lookup failed for tx ${txId}`);
    return null;
  }
  if (!tx || tx.id !== txId) {
    console.warn(`Explorer returned a mismatched tx for ${txId}`);
    return null;
  }
  if (!(tx.numConfirmations >= 1)) {
    return null;
  }

  const isErg = tokenId === null || tokenId === ERG_TOKEN_ID_MAP;
  let total = BigInt(0);
  for (const output of Array.isArray(tx.outputs) ? tx.outputs : []) {
    if (output?.address !== recipient || output?.mainChain === false) continue;
    if (isErg) {
      const value = toBigInt(output.value);
      if (value === null) return null;
      total += value;
    } else {
      for (const asset of Array.isArray(output.assets) ? output.assets : []) {
        if (asset?.tokenId !== tokenId) continue;
        const amount = toBigInt(asset.amount);
        if (amount === null) return null;
        total += amount;
      }
    }
  }
  return total;
};

// Serializes claims on one tx id so it can be credited only once.
export const withPaymentClaim = async <T>(
  txId: string,
  userId: string,
  claim: () => Promise<T>
): Promise<T> => {
  const lockId = `paymentClaim.${txId}`;
  const lock = await acquireTransactionalLock(lockId);
  try {
    if ((await prisma.transaction.findFirst({ where: { id: txId } })) !== null) {
      throw new Error(`Transaction ${txId} has already been used.`);
    }
    if (
      (await prisma.simpleTransaction.findFirst({ where: { txId } })) !== null
    ) {
      throw new Error(`Transaction ${txId} has already been used.`);
    }
    await assertPaymentIntent(txId, userId);
    return await claim();
  } finally {
    await releaseTransactionalLock(lockId, lock);
  }
};
