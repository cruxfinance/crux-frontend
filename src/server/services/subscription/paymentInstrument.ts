import { TransactionStatus } from "@prisma/client";
import { prisma } from "@server/prisma";
import { checkTransactionStatus } from "@server/utils/checkTransactionStatus";
import { getUnsignedTransaction } from "@server/utils/ergoClient";
import {
  acquireTransactionalLock,
  releaseTransactionalLock,
} from "./transactionLock";

const TRANSACTION_EXPIRY_TIMEOUT = 30 * 60 * 1000; // 30 mins
const RECIPIENT = process.env.ADMIN_ADDRESS ?? "";

// WARNING: Using this method outside this file or incorrectly may break stuff
const getTransaction = async (transactionId: string) => {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId },
  });
  if (transaction === null) {
    throw new Error(`Transaction ${transactionId} not found.`);
  }
  if (transaction.status !== TransactionStatus.PENDING) {
    return transaction;
  }
  const transactionStatus = await checkTransactionStatus(transaction.id);
  if (transactionStatus.status === TransactionStatus.CONFIRMED) {
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...transaction,
        status: TransactionStatus.CONFIRMED,
        updatedAt: new Date(),
      },
    });
    return updatedTransaction;
  }
  if (
    transaction.createdAt.getTime() + TRANSACTION_EXPIRY_TIMEOUT >=
    new Date().getTime()
  ) {
    return transaction;
  } else {
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...transaction,
        status: TransactionStatus.FAILED,
        updatedAt: new Date(),
      },
    });
    return updatedTransaction;
  }
};

interface CreatePaymentInstrument {
  userId: string;
  tokenId: string | null;
}

export const createPaymentInstrument = async (
  input: CreatePaymentInstrument
) => {
  const paymentInstrument = await prisma.paymentInstrument.create({
    data: {
      userId: input.userId,
      balance: 0,
      tokenId: input.tokenId,
    },
  });
  return paymentInstrument;
};

export const getPaymentInstrument = async (paymentInstrumentId: string) => {
  const lock = await acquireTransactionalLock(
    `getPaymentInstrument.${paymentInstrumentId}`
  );
  try {
    const paymentInstrument = await prisma.paymentInstrument.findFirst({
      where: { id: paymentInstrumentId },
    });
    if (paymentInstrument === null) {
      throw new Error(`PaymentInstrument ${paymentInstrumentId} not found.`);
    }
    const charges = await prisma.charge.findMany({
      where: {
        paymentInstrumentId: paymentInstrument.id,
      },
    });
    const transactions = await prisma.transaction.findMany({
      where: { paymentInstrumentId: paymentInstrument.id },
    });
    const pendingTransactions = transactions.filter(
      (transaction) => transaction.status === TransactionStatus.PENDING
    );
    if (pendingTransactions.length === 0) {
      return {
        ...paymentInstrument,
        transactions: transactions,
        charges: charges,
      };
    }
    const updatedTransactions = await Promise.all(
      transactions.map((transaction) => getTransaction(transaction.id))
    );
    const confirmedTransactions = updatedTransactions.filter(
      (transaction) => transaction?.status === TransactionStatus.CONFIRMED
    );
    const balance =
      confirmedTransactions
        .map((transaction) => transaction?.amount ?? 0)
        .map((amount) => Number(amount))
        .reduce((a, c) => a + c, 0) -
      charges.map((charge) => Number(charge.amount)).reduce((a, c) => a + c, 0);
    const updatedPaymentInstrument = await prisma.paymentInstrument.update({
      where: { id: paymentInstrument.id },
      data: {
        ...paymentInstrument,
        balance: balance,
        updatedAt: new Date(),
      },
    });
    return {
      ...updatedPaymentInstrument,
      transactions: updatedTransactions,
      charges: charges,
    };
  } catch (e: any) {
    throw e;
  } finally {
    await releaseTransactionalLock(
      `getPaymentInstrument.${paymentInstrumentId}`,
      lock
    );
  }
};

interface ChargePaymentInstrument {
  paymentInstrumentId: string;
  amount: number;
  tokenId: string | null;
  idempotencyKey: string;
}

export const chargePaymentInstrument = async (
  input: ChargePaymentInstrument
) => {
  if (input.amount < 0) {
    throw new Error(`Amount should be positive.`);
  }
  const lock = await acquireTransactionalLock(
    `chargePaymentInstrument.${input.paymentInstrumentId}`
  );
  try {
    const paymentInstrument = await getPaymentInstrument(
      input.paymentInstrumentId
    );
    if (paymentInstrument.tokenId !== input.tokenId) {
      throw new Error(
        `TokenId: ${input.tokenId} not supported for PaymentInstrument ${paymentInstrument.id}.`
      );
    }
    if (paymentInstrument.balance < input.amount) {
      throw new Error(
        `Insufficient balance for PaymentInstrument ${paymentInstrument.id}. Cannot charge ${input.amount} from ${paymentInstrument.balance}.`
      );
    }
    const charge = await prisma.charge.create({
      data: {
        id: input.idempotencyKey,
        paymentInstrumentId: input.paymentInstrumentId,
        amount: input.amount,
      },
    });
    const updatedPaymentInstrument = await prisma.paymentInstrument.update({
      where: {
        id: input.paymentInstrumentId,
      },
      data: {
        ...paymentInstrument,
        transactions: undefined,
        charges: undefined,
        balance: Number(paymentInstrument.balance) - input.amount,
        updatedAt: new Date(),
      },
    });
    return {
      paymentInstrument: updatedPaymentInstrument,
      charge: charge,
    };
  } catch (e: any) {
    throw e;
  } finally {
    await releaseTransactionalLock(
      `chargePaymentInstrument.${input.paymentInstrumentId}`,
      lock
    );
  }
};

interface AddPaymentInstrumentBalance {
  paymentInstrumentId: string;
  address: string;
  amount: number;
}

const createOrUpdateTransaction = async (
  id: string,
  paymentInstrumentId: string,
  amount: number
) => {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: id,
    },
  });
  if (transaction === null) {
    return await prisma.transaction.create({
      data: {
        id: id,
        paymentInstrumentId: paymentInstrumentId,
        amount: amount,
      },
    });
  }
  return transaction;
};

export const addPaymentInstrumentBalance = async (
  input: AddPaymentInstrumentBalance
) => {
  if (input.amount <= 0 || !Number.isInteger(input.amount)) {
    throw new Error(`Amount should be a positive integer.`);
  }
  const lock = await acquireTransactionalLock(
    `addPaymentInstrumentBalance.${input.paymentInstrumentId}`
  );
  try {
    const paymentInstrument = await getPaymentInstrument(
      input.paymentInstrumentId
    );
    const tx = await getUnsignedTransaction(input.address, RECIPIENT, {
      tokenId: paymentInstrument.tokenId ?? '',
      amount: input.amount,
    });
    const updatedPaymentInstrument = await prisma.paymentInstrument.update({
      where: { id: input.paymentInstrumentId },
      data: {
        ...paymentInstrument,
        transactions: undefined,
        charges: undefined,
        updatedAt: new Date(),
      },
    });
    const transaction = await createOrUpdateTransaction(
      tx.id,
      input.paymentInstrumentId,
      input.amount
    );
    return {
      unsignedTransaction: tx,
      transactionStatus: transaction,
      paymentInstrument: updatedPaymentInstrument,
    };
  } catch (e: any) {
    throw e;
  } finally {
    await releaseTransactionalLock(
      `addPaymentInstrumentBalance.${input.paymentInstrumentId}`,
      lock
    );
  }
};

export const findPaymentInstruments = async (userId: string) => {
  const paymentInstrumentIds = (
    await prisma.paymentInstrument.findMany({
      where: { userId: userId },
    })
  ).map((paymentInstrument) => paymentInstrument.id);
  const paymentInstruments = await Promise.all(
    paymentInstrumentIds.map((paymentInstrumentId) =>
      getPaymentInstrument(paymentInstrumentId)
    )
  );
  return paymentInstruments;
};
