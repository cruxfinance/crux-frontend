import { toCamelCase } from "@server/utils/camelCase";
import { mapAxiosErrorToTRPCError } from "@server/utils/mapErrors";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import { cruxApi } from "./axiosInstance";

declare global {
  type TTokenValue = {
    erg: number;
    usd: number;
  };

  type TTransactionElement = {
    fromAddress: string;
    toAddress: string;
    tokenId: string;
    tokenName: string;
    tokenDecimals: number;
    tokenAmount: number;
    tokenValue: TTokenValue;
  };

  type TTransaction = {
    time: number;
    transactionId: string;
    chainedTransactionId: string | null;
    transactionElements: TTransactionElement[];
  };

  type TTransactions = TTransaction[];
}

export const accountingApi = {
  async postTxHistory(addresses: string[]): Promise<TTransactions> {
    try {
      const response = await cruxApi.post("/crux/tx_history", {
        addresses: addresses,
      });
      return toCamelCase(response.data) as TTransactions;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw mapAxiosErrorToTRPCError(error);
      } else {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unknown error occurred",
        });
      }
    }
  }
};
