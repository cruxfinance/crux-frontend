import { PaymentInstrumentStatus, TransactionStatus } from "@prisma/client";
import { prisma } from "@server/prisma";
import { checkTransactionStatus } from "@server/utils/checkTransactionStatus";
import { getUnsignedTransaction } from "@server/utils/ergoClient";
import {
  acquireTransactionalLock,
  createTransactionalLock,
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
  await createTransactionalLock(paymentInstrument.id);
  return paymentInstrument;
};

export const getPaymentInstrument = async (paymentInstrumentId: string) => {
  const paymentInstrument = await prisma.paymentInstrument.findFirst({
    where: { id: paymentInstrumentId },
  });
  if (paymentInstrument === null) {
    throw new Error(`PaymentInstrument ${paymentInstrumentId} not found.`);
  }
  const lock = await acquireTransactionalLock(paymentInstrumentId);
  try {
    const transactions = await prisma.transaction.findMany({
      where: { paymentInstrumentId: paymentInstrument.id },
    });
    const pendingTransactions = transactions.filter(
      (transaction) => transaction.status === TransactionStatus.PENDING
    );
    if (pendingTransactions.length === 0) {
      if (paymentInstrument.status === PaymentInstrumentStatus.IN_USE) {
        const updatedPaymentInstrument = await prisma.paymentInstrument.update({
          where: { id: paymentInstrumentId },
          data: {
            ...paymentInstrument,
            status: PaymentInstrumentStatus.ACTIVE,
            updatedAt: new Date(),
          },
        });
        return {
          ...updatedPaymentInstrument,
          transactions: transactions,
        };
      }
      return {
        ...paymentInstrument,
        transactions: transactions,
      };
    }
    const updatedTransactions = await Promise.all(
      transactions.map(
        async (transaction) => await getTransaction(transaction.id)
      )
    );
    const updatedPendingTransactions = updatedTransactions.filter(
      (transaction) => transaction?.status === TransactionStatus.PENDING
    );
    const newConfirmedTransactions = updatedTransactions
      .filter(
        (transaction) => transaction?.status === TransactionStatus.CONFIRMED
      )
      .filter((transaction) =>
        pendingTransactions.map((tx) => tx.id).includes(transaction.id)
      );
    const balanceUpdate = newConfirmedTransactions
      .map((transaction) => transaction?.amount ?? 0)
      .map((amount) => Number(amount))
      .reduce((a, c) => a + c, 0);
    const updatedPaymentInstrument = await prisma.paymentInstrument.update({
      where: { id: paymentInstrument.id },
      data: {
        ...paymentInstrument,
        balance: Number(paymentInstrument.balance) + balanceUpdate,
        status:
          updatedPendingTransactions.length === 0
            ? PaymentInstrumentStatus.ACTIVE
            : PaymentInstrumentStatus.IN_USE,
        updatedAt: new Date(),
      },
    });
    return {
      ...updatedPaymentInstrument,
      transactions: updatedTransactions,
    };
  } catch (e: any) {
    throw e;
  } finally {
    await releaseTransactionalLock(paymentInstrumentId, lock);
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
  if (input.amount <= 0) {
    throw new Error(`Amount should be positive.`);
  }
  const paymentInstrument = await getPaymentInstrument(
    input.paymentInstrumentId
  );
  if (paymentInstrument.status === PaymentInstrumentStatus.IN_USE) {
    throw new Error(
      `PaymentInstrument ${input.paymentInstrumentId} is currently in use. Please try again later.`
    );
  }
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
  await prisma.idempotencyKey.create({
    data: {
      id: input.idempotencyKey,
    },
  });
  const updatedPaymentInstrument = await prisma.paymentInstrument.update({
    where: {
      id: input.paymentInstrumentId,
    },
    data: {
      ...paymentInstrument,
      transactions: undefined,
      balance: Number(paymentInstrument.balance) - input.amount,
      updatedAt: new Date(),
    },
  });
  return updatedPaymentInstrument;
};

interface AddPaymentInstrumentBalance {
  paymentInstrumentId: string;
  address: string;
  amount: number;
}

export const addPaymentInstrumentBalance = async (
  input: AddPaymentInstrumentBalance
) => {
  if (input.amount <= 0) {
    throw new Error(`Amount should be positive.`);
  }
  const paymentInstrument = await getPaymentInstrument(
    input.paymentInstrumentId
  );
  if (paymentInstrument === null) {
    throw new Error(
      `PaymentInstrument ${input.paymentInstrumentId} not found.`
    );
  }
  if (paymentInstrument.status === PaymentInstrumentStatus.IN_USE) {
    throw new Error(
      `PaymentInstrument ${input.paymentInstrumentId} is currently in use. Please try again later.`
    );
  }
  const tx = await getUnsignedTransaction(input.address, RECIPIENT, {
    tokenId: paymentInstrument.tokenId,
    amount: input.amount,
  });
  const updatedPaymentInstrument = await prisma.paymentInstrument.update({
    where: { id: input.paymentInstrumentId },
    data: {
      ...paymentInstrument,
      transactions: undefined,
      status: PaymentInstrumentStatus.IN_USE,
      updatedAt: new Date(),
    },
  });
  const transaction = await prisma.transaction.create({
    data: {
      id: tx.id,
      paymentInstrumentId: paymentInstrument.id,
      amount: input.amount,
    },
  });
  return {
    unsignedTransaction: tx,
    transactionStatus: transaction,
    paymentInstrument: updatedPaymentInstrument,
  };
};
