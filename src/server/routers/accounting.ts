import { getYearTimestamps } from "@lib/utils/daytime";
import { prisma } from "@server/prisma";
import { accountingApi } from "@server/services/accountingApi";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const accountingRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(
      z.object({
        addresses: z.array(z.string()),
        queries: z.object({
          offset: z.number().optional(),
          limit: z.number().optional()
        }).optional(),
        taxYear: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { addresses, queries, taxYear } = input;

      // Verify the user has a paid report for this tax year
      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          taxYear: taxYear,
          status: 'AVAILABLE',
        },
      });

      if (!report) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No paid report available for the specified tax year.',
        });
      }

      let dateFrom = report.dateFrom ? report.dateFrom.getTime() : getYearTimestamps(taxYear)[0];
      let dateTo = report.dateTo ? report.dateTo.getTime() : getYearTimestamps(taxYear)[1];

      const modifiedQueries = {
        ...queries,
        dateFrom,
        dateTo,
      };

      return await accountingApi.postTxHistory(addresses, modifiedQueries);
    }),
  downloadCsv: protectedProcedure
    .input(
      z.object({
        addresses: z.array(z.string()),
        queries: z.object({
          offset: z.number().optional(),
          limit: z.number().optional()
        }).optional(),
        taxYear: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { addresses, queries, taxYear } = input;

      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          taxYear: taxYear,
          status: 'AVAILABLE',
        },
      });

      if (!report) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No paid report available for the specified tax year.',
        });
      }

      let dateFrom = report.dateFrom ? report.dateFrom.getTime() : getYearTimestamps(taxYear)[0];
      let dateTo = report.dateTo ? report.dateTo.getTime() : getYearTimestamps(taxYear)[1];

      const modifiedQueries = {
        ...queries,
        dateFrom,
        dateTo,
      };

      return await accountingApi.downloadCsv(addresses, modifiedQueries);
    }),
  checkAvailableReport: protectedProcedure
    .input(z.object({
      taxYear: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { taxYear } = input;
      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          taxYear,
          status: 'AVAILABLE',
        },
      });

      return {
        available: report !== null,
        report,
      };
    }),
  checkPrepaidReports: protectedProcedure
    .query(async ({ ctx }) => {
      const prepaidReports = await prisma.report.findMany({
        where: {
          userId: ctx.session.user.id,
          status: 'PREPAID',
        },
      });

      return {
        hasPrepaidReports: prepaidReports.length > 0,
        prepaidReports,
      };
    }),
  usePrepaidReport: protectedProcedure
    .input(z.object({
      reportId: z.string(),
      taxYear: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { reportId, taxYear } = input;

      const report = await prisma.report.update({
        where: {
          id: reportId,
          // Ensure the report belongs to the user and is in PREPAID status
          AND: [
            { userId: ctx.session.user.id },
            { status: 'PREPAID' },
          ],
        },
        data: {
          taxYear,
          status: 'AVAILABLE',
        },
      });

      return report;
    }),
  processPaymentAndCreateReport: protectedProcedure
    .input(z.object({
      taxYear: z.number(),
      // Include other payment details as necessary
    }))
    .mutation(async ({ input, ctx }) => {
      const { taxYear } = input;

      // Here, integrate with payment processing logic
      // Assuming the payment is successful, proceed to create the report

      const newReport = await ctx.prisma.report.create({
        data: {
          userId: ctx.session.user.id,
          taxYear,
          status: 'AVAILABLE',
        },
      });

      return newReport;
    }),
});