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
  async postTxHistory(
    addresses: string[],
    queries?: {
      dateFrom?: number,
      dateTo?: number,
      offset?: number,
      limit?: number,
    }
  ): Promise<TTransactions> {
    try {
      const params = new URLSearchParams();

      if (queries) {
        if (queries.dateFrom) params.append('from', queries.dateFrom.toString());
        if (queries.dateTo) params.append('to', queries.dateTo.toString());
        if (queries.offset) params.append('offset', queries.offset.toString());
        if (queries.limit) params.append('limit', queries.limit.toString());
      }

      const queryString = params.toString();

      const response = await cruxApi.post(`/crux/tx_history?${queryString}`, {
        addresses: addresses,
      });

      // console.log(queryString)

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
  },
  async downloadCsv(
    addresses: string[],
    queries?: {
      dateFrom?: number,
      dateTo?: number,
      offset?: number,
      limit?: number,
    }
  ) {
    try {
      const params = new URLSearchParams();

      if (queries) {
        if (queries.dateFrom) params.append('from', queries.dateFrom.toString());
        if (queries.dateTo) params.append('to', queries.dateTo.toString());
        if (queries.offset) params.append('offset', queries.offset.toString());
        if (queries.limit) params.append('limit', queries.limit.toString());
      }

      const queryString = params.toString();

      const response = await cruxApi.post(`/crux/tx_history/csv?${queryString}`, {
        addresses: addresses,
      });

      return response.data;
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
  },
  async downloadKoinly(
    wallets: { addresses: string[]; name: string }[],
    reportId: string,
    queries: {
      dateFrom: number,
      dateTo: number,
    },
    baseUrl: string
  ) {
    try {
      const payload = {
        user: reportId, // it's called user but we use the reportId so the webhook updates the correct report in the db
        wallets,
        from_time: queries.dateFrom,
        to_time: queries.dateTo,
        webhook: `${baseUrl}/api/koinly`,
      };

      const response = await cruxApi.post(
        `/crux/koinly_csv_extract`,
        payload,
        {
          headers: {
            'API-KEY': process.env.API_KEY,
          }
        }
      );

      return response.data;
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
