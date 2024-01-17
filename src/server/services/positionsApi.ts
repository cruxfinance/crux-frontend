import { toCamelCase } from "@server/utils/camelCase";
import { mapAxiosErrorToTRPCError } from "@server/utils/mapErrors";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import { cruxApi } from "./axiosInstance";

declare global {
  type TTokenData = {
    tokenId: string;
    tokenName: string;
    tokenAmount: number;
    tradeDate: number;
    lastPrice: PriceInfo;
    costBasis: PriceInfo;
    pnlOpen: PriceInfo;
    pnlOpenPct: PriceInfo;
    pnlDay: PriceInfo;
    pnlDayPct: PriceInfo;
    pnlYear: PriceInfo;
    pnlYearPct: PriceInfo;
    totalCost: PriceInfo;
    totalValue: PriceInfo;
  };
  type TTokensData = TTokenData[];
  type TLpTokenData = {
    baseTokenId: string;
    baseTokenName: string;
    quoteTokenId: string;
    quoteTokenName: string;
    baseProvidedAmount: number;
    quoteProvidedAmount: number;
    baseCurrentAmount: number;
    quoteCurrentAmount: number;
    baseCurrentPrice: PriceInfo;
    quoteCurrentPrice: PriceInfo;
  }
  type TLpTokensData = TLpTokenData[];
}

export const positionsApi = {
  async postPositions(addresses: string[]): Promise<TTokensData> {
    try {
      const response = await cruxApi.post("/crux/positions", {
        addresses: addresses,
      });
      return toCamelCase(response.data) as TTokensData;
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
  async postLpPositions(addresses: string[]): Promise<TLpTokensData> {
    try {
      const response = await cruxApi.post("/crux/lp", {
        addresses: addresses,
      });
      return toCamelCase(response.data) as TLpTokensData;
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
};
