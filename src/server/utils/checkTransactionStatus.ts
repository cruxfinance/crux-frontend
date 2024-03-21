import { TransactionStatus } from "@prisma/client";
import { cruxApi } from "@server/services/axiosInstance";

// TODO: Migrate to crux/tx_status API
// export const checkTransactionStatus = async (transactionId: string) => {
//   try {
//     const res = await explorerApi.get(`/api/v1/transactions/${transactionId}`);
//     return {
//       status: TransactionStatus.CONFIRMED,
//     };
//   } catch (e) {
//     return {
//       status: TransactionStatus.NOT_FOUND,
//     };
//   }
// };

// const TRANSACTION_CONFIRMATION_COUNT = 2; // Use atleast two confirmations to protect against forks
const TRANSACTION_CONFIRMATION_COUNT = 1; // Using 1 because ergo block times typically don't cause forks

export const checkTransactionStatus = async (transactionId: string) => {
  try {
    const res = await cruxApi.get(`/crux/tx_status/${transactionId}`);
    if (res.data.num_confirmations >= TRANSACTION_CONFIRMATION_COUNT) {
      return {
        status: TransactionStatus.CONFIRMED,
      };
    } else if (
      0 <= res.data.num_confirmations &&
      res.data.num_confirmations < TRANSACTION_CONFIRMATION_COUNT
    ) {
      return {
        status: TransactionStatus.PENDING,
      };
    } else {
      return {
        status: TransactionStatus.NOT_FOUND,
      };
    }
  } catch (e) {
    throw new Error(
      "Transaction Status API in facing availability issues. Try again later."
    );
  }
};
