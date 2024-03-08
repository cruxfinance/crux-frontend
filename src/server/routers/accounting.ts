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
        reportId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { addresses, queries, reportId } = input;

      // Verify the user has a paid report for this tax year
      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          id: reportId,
          status: 'AVAILABLE',
        },
      });

      if (!report || !report.taxYear) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No paid report available for the specified tax year.',
        });
      }

      let dateFrom = report.dateFrom ? report.dateFrom.getTime() : getYearTimestamps(report.taxYear)[0];
      let dateTo = report.dateTo ? report.dateTo.getTime() : getYearTimestamps(report.taxYear)[1];

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
        reportId: z.string(),
        koinly: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { addresses, queries, reportId, koinly } = input;

      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          id: reportId,
          status: 'AVAILABLE',
        },
      });

      if (!report || !report.taxYear) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No paid report available for the specified tax year.',
        });
      }

      let dateFrom = report.dateFrom ? report.dateFrom.getTime() : getYearTimestamps(report.taxYear)[0];
      let dateTo = report.dateTo ? report.dateTo.getTime() : getYearTimestamps(report.taxYear)[1];

      const modifiedQueries = {
        ...queries,
        dateFrom,
        dateTo,
      };
      if (!koinly) {
        const download = await accountingApi.downloadCsv(addresses, modifiedQueries);
        return download
      } else {
        const download = await accountingApi.downloadKoinly(
          addresses,
          ctx.session.user.id
          // modifiedQueries
        );
        return download
      }
    }),
  checkAvailableReportsByYear: protectedProcedure
    .input(z.object({
      taxYear: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { taxYear } = input;
      const reports = await prisma.report.findMany({
        where: {
          userId: ctx.session.user.id,
          taxYear,
          status: 'AVAILABLE',
        },
      });

      return {
        available: reports.length > 0,
        reports,
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
      addresses: z.array(z.string())
    }))
    .mutation(async ({ input, ctx }) => {
      const { reportId, taxYear, addresses } = input;

      const report = await prisma.report.update({
        where: {
          id: reportId,
          AND: [
            { userId: ctx.session.user.id },
            { status: 'PREPAID' },
          ],
        },
        data: {
          taxYear,
          status: 'AVAILABLE',
          addresses
        },
      });

      return report;
    }),
  processPaymentAndCreateReport: protectedProcedure
    .input(z.object({
      taxYear: z.number(),
      status: z.enum(['AVAILABLE', 'PREPAID'])
    }))
    .mutation(async ({ input, ctx }) => {
      const { taxYear, status } = input;

      // integrate with payment processing logic
      // Assuming the payment is successful, proceed to create the report

      const newReport = await ctx.prisma.report.create({
        data: {
          userId: ctx.session.user.id,
          taxYear,
          status,
        },
      });

      return newReport;
    }),
  editReportCustomName: protectedProcedure
    .input(z.object({
      reportId: z.string(),
      customName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { reportId, customName } = input;

      // Check if the report belongs to the user
      const report = await prisma.report.findUnique({
        where: {
          id: reportId,
        },
      });

      if (!report || report.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Report not found or you don't have permission to edit this report",
        });
      }

      // Update the custom name of the report
      const updatedReport = await prisma.report.update({
        where: {
          id: reportId,
        },
        data: {
          customName,
        },
      });

      return updatedReport
    }),
});