import { RecurringPaymentSourceStatus } from "@prisma/client";
import { prisma } from "@server/prisma";
import {
  TransactionStatus,
  checkTransactionStatus,
} from "@server/utils/checkTransactionStatus";
import { getUnsignedTransaction } from "@server/utils/ergoClient";

interface CreateRecurringPaymentSource {
  amount: number;
  tokenId?: string;
  periodSeconds: number;
}

interface ChargeRecurringPaymentSource {
  id: string;
  address: string;
}

const TRANSACTION_EXPIRY_TIMEOUT = 30 * 60 * 1000; // 30 mins
const RECIPIENT = process.env.ADMIN_ADDRESS ?? "";

export const createRecurringPaymentSource = async (
  input: CreateRecurringPaymentSource
) => {
  const recurringPaymentSource = {
    amount: input.amount,
    tokenId: input.tokenId,
    periodSeconds: input.periodSeconds,
    status: RecurringPaymentSourceStatus.CREATED,
  };
  const createdRecurringPaymentSource =
    await prisma.recurringPaymentSource.create({
      data: recurringPaymentSource,
    });
  return createdRecurringPaymentSource;
};

export const getRecurringPaymentSource = async (id: string) => {
  const recurringPaymentSource = await prisma.recurringPaymentSource.findFirst({
    where: { id },
  });
  if (
    recurringPaymentSource === null ||
    recurringPaymentSource.status === RecurringPaymentSourceStatus.CREATED ||
    recurringPaymentSource.status === RecurringPaymentSourceStatus.EXPIRED
  ) {
    return recurringPaymentSource;
  }
  if (recurringPaymentSource.status === RecurringPaymentSourceStatus.PENDING) {
    if (recurringPaymentSource.transactionId === null) {
      throw new Error(
        "TransactionId cannot be null if RecurringPaymentSource is in PENDING state"
      );
    }
    const transactionStatus = await checkTransactionStatus(
      recurringPaymentSource.transactionId
    );
    if (transactionStatus.status === TransactionStatus.CONFIRMED) {
      const updatedRecurringPaymentSource =
        await prisma.recurringPaymentSource.update({
          where: { id },
          data: {
            ...recurringPaymentSource,
            transactionConfirmationTime: new Date(transactionStatus.timestamp),
            status: RecurringPaymentSourceStatus.ACTIVE,
          },
        });
      return updatedRecurringPaymentSource;
    } else {
      if (
        recurringPaymentSource.updatedAt.getTime() +
          TRANSACTION_EXPIRY_TIMEOUT <
        new Date().getTime()
      ) {
        const updatedRecurringPaymentSource =
          await prisma.recurringPaymentSource.update({
            where: { id },
            data: {
              ...recurringPaymentSource,
              status: RecurringPaymentSourceStatus.EXPIRED,
            },
          });
        return updatedRecurringPaymentSource;
      }
    }
  } else if (
    recurringPaymentSource.status === RecurringPaymentSourceStatus.ACTIVE
  ) {
    if (recurringPaymentSource.transactionConfirmationTime === null) {
      throw new Error(
        "TransactionConfirmationTime cannot be null if RecurringPaymentSource is in ACTIVE state"
      );
    }
    if (
      recurringPaymentSource.transactionConfirmationTime.getTime() +
        recurringPaymentSource.periodSeconds * 1000 <
      new Date().getTime()
    ) {
      const updatedRecurringPaymentSource =
        await prisma.recurringPaymentSource.update({
          where: { id },
          data: {
            ...recurringPaymentSource,
            status: RecurringPaymentSourceStatus.EXPIRED,
          },
        });
      return updatedRecurringPaymentSource;
    }
  }
  return recurringPaymentSource;
};

export const chargeRecurringPaymentSource = async (
  input: ChargeRecurringPaymentSource
) => {
  const recurringPaymentSource = await getRecurringPaymentSource(input.id);
  if (recurringPaymentSource === null) {
    throw new Error(`NotFound: RecurringPaymentSource with id ${input.id}`);
  }
  if (
    recurringPaymentSource.status === RecurringPaymentSourceStatus.ACTIVE ||
    recurringPaymentSource.status === RecurringPaymentSourceStatus.PENDING
  ) {
    throw new Error(`RecurringPaymentSource is in a non chargeable state`);
  }
  const tx = await getUnsignedTransaction(input.address, RECIPIENT, {
    tokenId: recurringPaymentSource.tokenId,
    amount: Number(recurringPaymentSource.amount.toString()),
  });
  const updatedRecurringPaymentSource =
    await prisma.recurringPaymentSource.update({
      where: {
        id: input.id,
      },
      data: {
        ...recurringPaymentSource,
        transactionId: tx.id,
        transactionConfirmationTime: null,
        status: RecurringPaymentSourceStatus.PENDING,
      },
    });
  return {
    unsignedTransaction: tx,
    recurringPaymentSource: updatedRecurringPaymentSource,
  };
};
