import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@server/trpc";
import { dexyApi } from "@server/services/dexyApi";

const dexyMetricSchema = z.enum([
  "reserve_ratio",
  "relative_reserve_ratio",
  "relative_rr_with_lp",
  "stablecoin_circulation",
  "stablecoin_in_core_lp",
  "stablecoin_on_hands",
  "erg_in_bank",
  "erg_tvl",
  "protocol_tvl_usd",
]);

const dexyResolutionSchema = z.enum(["1h", "1d", "1w"]);

const mintTypeSchema = z.enum(["arbmint", "freemint"]);

export const dexyRouter = createTRPCRouter({
  getAnalytics: publicProcedure
    .input(
      z.object({
        instanceName: z.string().default("USE"),
      }),
    )
    .query(async ({ input }) => {
      return await dexyApi.getAnalytics(input.instanceName);
    }),

  getHistory: publicProcedure
    .input(
      z.object({
        instanceName: z.string().default("USE"),
        metric: dexyMetricSchema,
        from: z.number(),
        to: z.number(),
        resolution: dexyResolutionSchema,
      }),
    )
    .query(async ({ input }) => {
      return await dexyApi.getAnalyticsHistory(
        input.instanceName,
        input.metric,
        input.from,
        input.to,
        input.resolution,
      );
    }),

  getInstances: publicProcedure.query(async () => {
    return await dexyApi.getInstances();
  }),

  getMintStatus: publicProcedure
    .input(
      z.object({
        instanceName: z.string(),
        mintType: mintTypeSchema,
        feeToken: z.string().default("erg"),
      }),
    )
    .query(async ({ input }) => {
      return await dexyApi.getMintStatus(
        input.instanceName,
        input.mintType,
        input.feeToken,
      );
    }),

  buildMintTx: publicProcedure
    .input(
      z.object({
        instanceName: z.string(),
        mintType: mintTypeSchema,
        userAddresses: z.string(),
        targetAddress: z.string(),
        ergAmount: z.number(),
        feeToken: z.string().default("erg"),
      }),
    )
    .mutation(async ({ input }) => {
      return await dexyApi.buildMintTx(input.instanceName, {
        mintType: input.mintType,
        userAddresses: input.userAddresses,
        targetAddress: input.targetAddress,
        ergAmount: input.ergAmount,
        feeToken: input.feeToken,
      });
    }),
});
