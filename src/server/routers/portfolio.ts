import { positionsApi } from "@server/services/positionsApi";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const portfolioRouter = createTRPCRouter({
  getPositions: publicProcedure
    .input(
      z.object({
        addresses: z.array(z.string()),
      })
    )
    .query(async ({ input }) => {
      const { addresses } = input;
      return await positionsApi.postPositions(addresses);
    }),
});
