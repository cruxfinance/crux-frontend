import { accountingApi } from "@server/services/accountingApi";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const accountingRouter = createTRPCRouter({
  getTransactions: publicProcedure
    .input(
      z.object({
        addresses: z.array(z.string()),
      })
    )
    .query(async ({ input }) => {
      const { addresses } = input;
      return await accountingApi.postTxHistory(addresses);
    }),
});
