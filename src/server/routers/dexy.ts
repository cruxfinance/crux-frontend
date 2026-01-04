import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@server/trpc";
import { dexyApi } from "@server/services/dexyApi";

const dexyMetricSchema = z.enum([
  "reserve_ratio",
  "relative_reserve_ratio",
  "relative_rr_with_lp",
  "stablecoin_circulation",
  "stablecoin_in_lp",
  "stablecoin_on_hands",
  "erg_in_bank",
  "erg_tvl",
]);

const dexyResolutionSchema = z.enum(["1h", "1d", "1w"]);

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
});
