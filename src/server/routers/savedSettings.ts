import { createTRPCRouter, protectedProcedure } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const filterPresetSchema = z.object({
  id: z.string().optional(), // Make id optional for creation
  presetName: z.string(),
  timeframe: z.enum(['Hour', 'Day', 'Week', 'Month']),
  sort_by: z.string().optional(),
  sort_order: z.enum(['Desc', 'Asc']).optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  liquidity_min: z.number().optional(),
  liquidity_max: z.number().optional(),
  market_cap_min: z.number().optional(),
  market_cap_max: z.number().optional(),
  pct_change_min: z.number().optional(),
  pct_change_max: z.number().optional(),
  volume_min: z.number().optional(),
  volume_max: z.number().optional(),
  buys_min: z.number().optional(),
  buys_max: z.number().optional(),
  sells_min: z.number().optional(),
  sells_max: z.number().optional(),
  currency: z.string().optional(),
  searchString: z.string().optional(),
});

export const savedSettingsRouter = createTRPCRouter({
  createNewFilterPreset: protectedProcedure
    .input(filterPresetSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const newPreset = await ctx.prisma.filterPreset.create({
        data: {
          ...input,
          userId,
          price_min: input.price_min?.toString(),
          price_max: input.price_max?.toString(),
          liquidity_min: input.liquidity_min?.toString(),
          liquidity_max: input.liquidity_max?.toString(),
          market_cap_min: input.market_cap_min?.toString(),
          market_cap_max: input.market_cap_max?.toString(),
          pct_change_min: input.pct_change_min?.toString(),
          pct_change_max: input.pct_change_max?.toString(),
          volume_min: input.volume_min?.toString(),
          volume_max: input.volume_max?.toString(),
        },
      });
      return newPreset;
    }),

  getUsersFilterPresets: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const presets = await ctx.prisma.filterPreset.findMany({
        where: { userId },
      });
      // Convert string values to numbers where appropriate
      return presets.map(preset => ({
        ...preset,
        price_min: preset.price_min ? Number(preset.price_min) : undefined,
        price_max: preset.price_max ? Number(preset.price_max) : undefined,
        liquidity_min: preset.liquidity_min ? Number(preset.liquidity_min) : undefined,
        liquidity_max: preset.liquidity_max ? Number(preset.liquidity_max) : undefined,
        market_cap_min: preset.market_cap_min ? Number(preset.market_cap_min) : undefined,
        market_cap_max: preset.market_cap_max ? Number(preset.market_cap_max) : undefined,
        pct_change_min: preset.pct_change_min ? Number(preset.pct_change_min) : undefined,
        pct_change_max: preset.pct_change_max ? Number(preset.pct_change_max) : undefined,
        volume_min: preset.volume_min ? Number(preset.volume_min) : undefined,
        volume_max: preset.volume_max ? Number(preset.volume_max) : undefined,
      }));
    }),

  updateSavedFilterPreset: protectedProcedure
    .input(filterPresetSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const updatedPreset = await ctx.prisma.filterPreset.update({
        where: {
          id: input.id,
          userId, // Ensure the preset belongs to the user
        },
        data: {
          ...input,
          userId,
          price_min: input.price_min?.toString() || null,
          price_max: input.price_max?.toString() || null,
          liquidity_min: input.liquidity_min?.toString() || null,
          liquidity_max: input.liquidity_max?.toString() || null,
          market_cap_min: input.market_cap_min?.toString() || null,
          market_cap_max: input.market_cap_max?.toString() || null,
          pct_change_min: input.pct_change_min?.toString() || null,
          pct_change_max: input.pct_change_max?.toString() || null,
          volume_min: input.volume_min?.toString() || null,
          volume_max: input.volume_max?.toString() || null,
        },
      });
      if (!updatedPreset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Preset not found or does not belong to the user',
        });
      }
      return updatedPreset;
    }),

  deleteSavedFilterPreset: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const deletedPreset = await ctx.prisma.filterPreset.delete({
        where: {
          id: input.id,
          userId, // Ensure the preset belongs to the user
        },
      });
      if (!deletedPreset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Preset not found or does not belong to the user',
        });
      }
      return deletedPreset;
    }),
});