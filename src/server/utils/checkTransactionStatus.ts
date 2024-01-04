import { explorerApi } from "@server/services/axiosInstance";

export enum TransactionStatus {
  PENDING, // TODO: implement pending check
  CONFIRMED,
  NOT_FOUND,
}

export const checkTransactionStatus = async (transactionId: string) => {
  try {
    const res = await explorerApi.get(`/api/v1/transactions/${transactionId}`);
    return {
      status: TransactionStatus.CONFIRMED,
      timestamp: res.data.timestamp as number,
    };
  } catch (e) {
    return {
      status: TransactionStatus.NOT_FOUND,
      timestamp: 0,
    };
  }
};
