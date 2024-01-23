import { TransactionStatus } from "@prisma/client";
import { explorerApi, cruxApi } from "@server/services/axiosInstance";

// TODO: Migrate to crux/tx_status API
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

// const TRANSACTION_CONFIRMATION_COUNT = 2;

// export const checkTransactionStatus = async (transactionId: string) => {
//   try {
//     const res = (await cruxApi.get(`crux/tx_status/${transactionId}`)).data;
//     if (res.data.num_confirmations >= TRANSACTION_CONFIRMATION_COUNT) {
//       return {
//         status: TransactionStatus.CONFIRMED,
//         timestamp: res.data.timestamp as number,
//       };
//     } else if (
//       0 <= res.data.num_confirmations &&
//       res.data.num_confirmations < TRANSACTION_CONFIRMATION_COUNT
//     ) {
//       return {
//         status: TransactionStatus.PENDING,
//         timestamp: 0,
//       };
//     } else {
//       return {
//         status: TransactionStatus.NOT_FOUND,
//         timestamp: 0,
//       };
//     }
//   } catch (e) {
//     return {
//       status: TransactionStatus.NOT_FOUND,
//       timestamp: 0,
//     };
//   }
// };
