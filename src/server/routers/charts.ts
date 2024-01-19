import { prisma } from "@server/prisma";
import { createTRPCRouter, protectedProcedure } from '@server/trpc';
import { z } from 'zod';

export const chartsRouter = createTRPCRouter({
  saveChartData: protectedProcedure
    .input(z.object({
      symbol: z.string(),
      data: z.any(), // Adjust based on the expected data structure
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { symbol, data } = input;

      try {
        const chartData = await prisma.chartData.upsert({
          where: { userId_symbol: { userId, symbol } },
          create: { userId, symbol, data },
          update: { data },
        });
        return { status: 'success', message: 'Chart data saved', chartData };
      } catch (error) {
        console.error('Error saving chart data:', error);
        throw new Error('Failed to save chart data');
      }
    }),
  loadChartData: protectedProcedure
    .input(z.object({
      symbol: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { symbol } = input;

      try {
        const chartData = await prisma.chartData.findFirst({
          where: { userId, symbol },
        });
        return chartData ? { status: 'success', chartData } : { status: 'not_found' };
      } catch (error) {
        console.error('Error loading chart data:', error);
        throw new Error('Failed to load chart data');
      }
    }),
})