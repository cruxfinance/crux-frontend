import { getYearTimestamps } from "@lib/utils/daytime";
import { prisma } from "@server/prisma";
import { accountingApi } from "@server/services/accountingApi";
import { checkTransactionStatus } from "@server/utils/checkTransactionStatus";
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { addresses, queries, reportId } = input;

      console.log(`${process.env.BASE_URL}/api/koinly`)

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
      const download = await accountingApi.downloadCsv(addresses, modifiedQueries);
      return download
    }),
  downloadKoinly: protectedProcedure
    .input(
      z.object({
        wallets: z.array(z.object({
          addresses: z.array(z.string()),
          name: z.string()
        })),
        reportId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { wallets, reportId } = input;

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
        dateFrom,
        dateTo,
      };
      const download = await accountingApi.downloadKoinly(
        wallets,
        reportId,
        modifiedQueries
      );

      if (download) {
        await prisma.report.update({
          where: {
            userId: ctx.session.user.id,
            id: reportId,
          },
          data: {
            koinlyGenerating: true
          }
        });
      }

      return download
    }),
  getReportById: protectedProcedure
    .input(z.object({
      reportId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { reportId } = input;

      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          id: reportId
        },
      });

      return report;
    }),
  fetchAllUserReports: protectedProcedure
    .input(z.object({
    }))
    .query(async ({ ctx }) => {

      // Fetch reports with either AVAILABLE or PAYMENT_PENDING status
      const reports = await prisma.report.findMany({
        where: {
          userId: ctx.session.user.id,
          status: {
            in: ['AVAILABLE', 'PAYMENT_PENDING'],
          },
        },
      });

      const availableReports = reports.filter(report => report.status === 'AVAILABLE');
      const pendingPaymentReports = reports.filter(report => report.status === 'PAYMENT_PENDING');

      return {
        available: availableReports.length > 0,
        paymentPending: pendingPaymentReports.length > 0,
        reports
      };
    }),
  checkAvailableReportsByYear: protectedProcedure
    .input(z.object({
      taxYear: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { taxYear } = input;

      // Fetch reports with either AVAILABLE or PAYMENT_PENDING status
      // PREPAID reports won't show up anyway, as they haven't been assigned a taxYear
      const reports = await prisma.report.findMany({
        where: {
          userId: ctx.session.user.id,
          taxYear,
          status: {
            in: ['AVAILABLE', 'PAYMENT_PENDING'],
          },
        },
      });

      const availableReports = reports.filter(report => report.status === 'AVAILABLE');
      const pendingPaymentReports = reports.filter(report => report.status === 'PAYMENT_PENDING');

      return {
        available: availableReports.length > 0,
        paymentPending: pendingPaymentReports.length > 0,
        reports
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
  createPrepaidReportDev: protectedProcedure
    .input(z.object({
      taxYear: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { taxYear } = input;

      const report = await prisma.report.create({
        data: {
          userId: ctx.session.user.id,
          taxYear,
          status: 'PREPAID',
          customName: `${taxYear} Report`
        },
      });

      return report;
    }),
  usePrepaidReport: protectedProcedure
    .input(z.object({
      reportId: z.string(),
      taxYear: z.number(),
      wallets: z.array(z.object({
        addresses: z.array(z.string()),
        name: z.string()
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      const { reportId, taxYear, wallets } = input;

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
          wallets
        },
      });

      return report;
    }),
  initiateReportPayment: protectedProcedure // use this after the user has made a payment and we have a txId
    .input(z.object({
      taxYear: z.number(),
      txId: z.string(),
      paymentAmounts: z.array(z.object({
        amount: z.number(),
        tokenId: z.string()
      })),
      wallets: z.array(z.object({
        addresses: z.array(z.string()),
        name: z.string()
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      const { taxYear, paymentAmounts, wallets, txId } = input;

      try {
        const currentReportsThisYear = await prisma.report.findMany({
          where: {
            userId: ctx.session.user.id,
            taxYear
          }
        })
        // Step 1: Create the report
        const newReport = await prisma.report.create({
          data: {
            userId: ctx.session.user.id,
            taxYear,
            wallets: wallets,
            status: "PAYMENT_PENDING",
            customName: `${taxYear} Report ${currentReportsThisYear.length + 1}`
          },
        });

        // Step 2: Create the SimpleTransaction for the report payment
        const createdTx = await prisma.simpleTransaction.create({
          data: {
            userId: ctx.session.user.id,
            paymentFor: "report",
            itemId: newReport.id,
            amounts: paymentAmounts,
            status: 'PENDING',
            txId
          },
        });

        return {
          transaction: createdTx,
          report: newReport,
        };
      } catch (error) {
        throw new Error('Failed to initiate report payment.');
      }
    }),
  // used to check all transactions the user has initiated for a given report
  checkReportTxStatuses: protectedProcedure
    .input(z.object({
      txIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const { txIds } = input;

      const statusesPromise = txIds.map(async txId => {
        const status = await checkTransactionStatus(txId);
        return { txId, ...status }; // Ensure txId is part of the returned object
      });

      const statuses = await Promise.all(statusesPromise);

      // Retrieve current statuses for all transactions
      const currentTransactions = await prisma.simpleTransaction.findMany({
        where: {
          txId: {
            in: txIds,
          },
        },
        select: {
          txId: true,
          status: true,
        },
      });

      // Create a map of current txIds to their statuses for quick lookup
      const currentStatusMap = new Map(currentTransactions.map(tx => [tx.txId, tx.status]));

      // Filter out transactions whose status has changed
      const transactionsToUpdate = statuses.filter(({ txId, status }) => currentStatusMap.get(txId) !== status);

      // Update transactions with new status
      await Promise.all(transactionsToUpdate.map(({ txId, status }) =>
        prisma.simpleTransaction.updateMany({
          where: { txId },
          data: { status },
        })
      ));

      // Return the updated transactions for confirmation
      return statuses;
    }),
  listReportTxs: protectedProcedure
    .input(z.object({
      reportId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const { reportId } = input;
      const userId = ctx.session.user.id

      const transactions = await prisma.simpleTransaction.findMany({
        where: {
          itemId: reportId,
          paymentFor: "report",
          userId
        },
      });

      return transactions;
    }),
  verifyReportPurchaseTransaction: protectedProcedure
    .input(z.object({
      txId: z.string(),
      reportId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { txId, reportId } = input;

      const transaction = await prisma.simpleTransaction.findFirst({
        where: { txId },
      });
      if (transaction === null) {
        throw new Error(`Transaction ${txId} not found.`);
      }
      const transactionStatus = await checkTransactionStatus(txId);
      if (transactionStatus.status === "CONFIRMED") {
        const updatedReport = await prisma.report.update({
          where: {
            userId: ctx.session.user.id,
            id: reportId,
          },
          data: {
            status: "AVAILABLE",
          },
        });

        return {
          status: "CONFIRMED",
          report: updatedReport,
          message: "Transaction confirmed and report has been updated"
        };
      }
      else if (transactionStatus.status === "PENDING") {
        return {
          status: "PENDING"
        }
      }
      else
        return {
          status: "NOT_FOUND",
          message: "Transaction not yet found on-chain. "
        }
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
    })
});