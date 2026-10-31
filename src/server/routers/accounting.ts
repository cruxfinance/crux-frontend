import { getYearTimestamps } from "@lib/utils/daytime";
import { prisma } from "@server/prisma";
import { accountingApi } from "@server/services/accountingApi";
import { allowedTokens, ERG_TOKEN_ID_MAP } from "@lib/configs/paymentTokens";
import { getPriceForProduct } from "@lib/configs/productCosts";
import { checkTransactionStatus } from "@server/utils/checkTransactionStatus";
import { getTokenPriceInfo } from "@server/utils/tokenPrice";
import {
  getPaidAmount,
  txIdSchema,
  withPaymentClaim,
} from "@server/utils/verifyPayment";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// The client quotes its own spot price while the server uses the 24h average.
const REPORT_PRICE_TOLERANCE = 0.8;

export const accountingRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(
      z.object({
        addresses: z.array(z.string()),
        queries: z
          .object({
            offset: z.number().optional(),
            limit: z.number().optional(),
          })
          .optional(),
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
          status: "AVAILABLE",
        },
      });

      if (!report || !report.taxYear) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No paid report available for the specified tax year.",
        });
      }

      let dateFrom = report.dateFrom
        ? report.dateFrom.getTime()
        : getYearTimestamps(report.taxYear)[0];
      let dateTo = report.dateTo
        ? report.dateTo.getTime()
        : getYearTimestamps(report.taxYear)[1];

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
        queries: z
          .object({
            offset: z.number().optional(),
            limit: z.number().optional(),
          })
          .optional(),
        reportId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { addresses, queries, reportId } = input;

      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          id: reportId,
          status: "AVAILABLE",
        },
      });

      if (!report || !report.taxYear) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No paid report available for the specified tax year.",
        });
      }

      let dateFrom = report.dateFrom
        ? report.dateFrom.getTime()
        : getYearTimestamps(report.taxYear)[0];
      let dateTo = report.dateTo
        ? report.dateTo.getTime()
        : getYearTimestamps(report.taxYear)[1];

      const modifiedQueries = {
        ...queries,
        dateFrom,
        dateTo,
      };
      const download = await accountingApi.downloadCsv(
        addresses,
        modifiedQueries
      );
      return download;
    }),
  downloadKoinly: protectedProcedure
    .input(
      z.object({
        wallets: z.array(
          z.object({
            addresses: z.array(z.string()),
            name: z.string(),
          })
        ),
        reportId: z.string(),
        baseUrl: z.string(), // dynamic for webhook to match the source url
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { wallets, reportId, baseUrl } = input;

      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          id: reportId,
          status: "AVAILABLE",
        },
      });

      if (!report || !report.taxYear) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No paid report available for the specified tax year.",
        });
      }

      const claimed = await prisma.report.updateMany({
        where: {
          id: reportId,
          userId: ctx.session.user.id,
          OR: [
            { koinlyGenerating: false },
            { updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } },
          ],
        },
        data: { koinlyGenerating: true },
      });

      if (claimed.count === 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "A Koinly export is already being generated for this report.",
        });
      }

      let dateFrom = report.dateFrom
        ? report.dateFrom.getTime()
        : getYearTimestamps(report.taxYear)[0];
      let dateTo = report.dateTo
        ? report.dateTo.getTime()
        : getYearTimestamps(report.taxYear)[1];

      const modifiedQueries = {
        dateFrom,
        dateTo,
      };

      let download;
      try {
        download = await accountingApi.downloadKoinly(
          wallets,
          reportId,
          modifiedQueries,
          baseUrl
        );
      } catch (error) {
        await prisma.report.updateMany({
          where: { id: reportId, userId: ctx.session.user.id },
          data: { koinlyGenerating: false },
        });
        throw error;
      }

      if (!download) {
        await prisma.report.updateMany({
          where: { id: reportId, userId: ctx.session.user.id },
          data: { koinlyGenerating: false },
        });
      }

      return download;
    }),
  getReportById: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { reportId } = input;

      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.session.user.id,
          id: reportId,
        },
      });

      return report;
    }),
  fetchAllUserReports: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      // Fetch reports with either AVAILABLE or PAYMENT_PENDING status
      const reports = await prisma.report.findMany({
        where: {
          userId: ctx.session.user.id,
          status: {
            in: ["AVAILABLE", "PAYMENT_PENDING"],
          },
        },
      });

      const availableReports = reports.filter(
        (report) => report.status === "AVAILABLE"
      );
      const pendingPaymentReports = reports.filter(
        (report) => report.status === "PAYMENT_PENDING"
      );

      return {
        available: availableReports.length > 0,
        paymentPending: pendingPaymentReports.length > 0,
        reports,
      };
    }),
  checkAvailableReportsByYear: protectedProcedure
    .input(
      z.object({
        taxYear: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { taxYear } = input;

      // Fetch reports with either AVAILABLE or PAYMENT_PENDING status
      // PREPAID reports won't show up anyway, as they haven't been assigned a taxYear
      const reports = await prisma.report.findMany({
        where: {
          userId: ctx.session.user.id,
          taxYear,
          status: {
            in: ["AVAILABLE", "PAYMENT_PENDING"],
          },
        },
      });

      const availableReports = reports.filter(
        (report) => report.status === "AVAILABLE"
      );
      const pendingPaymentReports = reports.filter(
        (report) => report.status === "PAYMENT_PENDING"
      );

      return {
        available: availableReports.length > 0,
        paymentPending: pendingPaymentReports.length > 0,
        reports,
      };
    }),
  checkPrepaidReports: protectedProcedure.query(async ({ ctx }) => {
    const prepaidReports = await prisma.report.findMany({
      where: {
        userId: ctx.session.user.id,
        status: "PREPAID",
      },
    });

    return {
      hasPrepaidReports: prepaidReports.length > 0,
      prepaidReports,
    };
  }),
  createPrepaidReportDev: protectedProcedure
    .input(
      z.object({
        taxYear: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taxYear } = input;

      const report = await prisma.report.create({
        data: {
          userId: ctx.session.user.id,
          taxYear,
          status: "PREPAID",
          customName: `${taxYear} Report`,
        },
      });

      return report;
    }),
  usePrepaidReport: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        taxYear: z.number(),
        wallets: z.array(
          z.object({
            addresses: z.array(z.string()),
            name: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { reportId, taxYear, wallets } = input;

      const report = await prisma.report.update({
        where: {
          id: reportId,
          AND: [{ userId: ctx.session.user.id }, { status: "PREPAID" }],
        },
        data: {
          taxYear,
          status: "AVAILABLE",
          wallets,
          customName: "New prepaid report",
        },
      });

      return report;
    }),
  initiateReportPayment: protectedProcedure // use this after the user has made a payment and we have a txId
    .input(
      z.object({
        taxYear: z.number(),
        txId: txIdSchema,
        paymentAmounts: z.array(
          z.object({
            amount: z.number(),
            tokenId: z.string(),
          })
        ),
        wallets: z.array(
          z.object({
            addresses: z.array(z.string()),
            name: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taxYear, paymentAmounts, wallets, txId } = input;

      const created = await withPaymentClaim(txId, ctx.session.user.id, async () => {
        try {
          const currentReportsThisYear = await prisma.report.findMany({
            where: {
              userId: ctx.session.user.id,
              taxYear,
            },
          });
          // Step 1: Create the report
          const newReport = await prisma.report.create({
            data: {
              userId: ctx.session.user.id,
              taxYear,
              wallets: wallets,
              status: "PAYMENT_PENDING",
              customName: `${taxYear} Report ${
                currentReportsThisYear.length + 1
              }`,
            },
          });

          // Step 2: Create the SimpleTransaction for the report payment
          const createdTx = await prisma.simpleTransaction.create({
            data: {
              userId: ctx.session.user.id,
              paymentFor: "report",
              itemId: newReport.id,
              amounts: paymentAmounts,
              status: "PENDING",
              txId,
            },
          });

          return {
            transaction: createdTx,
            report: newReport,
          };
        } catch (error) {
          throw new Error("Failed to initiate report payment.");
        }
      });
      return created;
    }),
  // used to check all transactions the user has initiated for a given report
  checkReportTxStatuses: protectedProcedure
    .input(
      z.object({
        txIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { txIds } = input;

      const statusesPromise = txIds.map(async (txId) => {
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
      const currentStatusMap = new Map(
        currentTransactions.map((tx) => [tx.txId, tx.status])
      );

      // Filter out transactions whose status has changed
      const transactionsToUpdate = statuses.filter(
        ({ txId, status }) => currentStatusMap.get(txId) !== status
      );

      // Update transactions with new status
      await Promise.all(
        transactionsToUpdate.map(({ txId, status }) =>
          prisma.simpleTransaction.updateMany({
            where: { txId },
            data: { status },
          })
        )
      );

      // Return the updated transactions for confirmation
      return statuses;
    }),
  listReportTxs: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { reportId } = input;
      const userId = ctx.session.user.id;

      const transactions = await prisma.simpleTransaction.findMany({
        where: {
          itemId: reportId,
          paymentFor: "report",
          userId,
        },
      });

      return transactions;
    }),
  verifyReportPurchaseTransaction: protectedProcedure
    .input(
      z.object({
        txId: txIdSchema,
        reportId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { txId, reportId } = input;

      // This row is the link between the tx and the report
      const transaction = await prisma.simpleTransaction.findFirst({
        where: {
          txId,
          userId: ctx.session.user.id,
          paymentFor: "report",
          itemId: reportId,
        },
      });
      if (transaction === null) {
        throw new Error(`Transaction ${txId} not found.`);
      }
      const transactionStatus = await checkTransactionStatus(txId);
      if (transactionStatus.status === "CONFIRMED") {
        if (await prisma.transaction.findFirst({ where: { id: txId } })) {
          throw new Error(`Transaction ${txId} has already been used.`);
        }
        // Legacy duplicate rows: only the oldest claimant may redeem the tx
        const oldest = await prisma.simpleTransaction.findFirst({
          where: { txId },
          orderBy: { createdAt: "asc" },
        });
        if (oldest?.id !== transaction.id) {
          throw new Error(`Transaction ${txId} has already been used.`);
        }

        const amounts = transaction.amounts as { tokenId: string }[] | null;
        const tokenId = amounts?.[0]?.tokenId;
        const token = allowedTokens.find((t) => t.id === tokenId);
        if (!token) {
          throw new Error(`Token ${tokenId} is not accepted for payment.`);
        }

        const paid = await getPaidAmount(
          txId,
          token.id === ERG_TOKEN_ID_MAP ? null : token.id
        );
        if (paid === null) {
          return {
            status: "PENDING",
          };
        }

        const level =
          ctx.session.user.privilegeLevel === "PRO" ||
          ctx.session.user.privilegeLevel === "BASIC"
            ? ctx.session.user.privilegeLevel
            : "DEFAULT";
        const { discountedPrice } = getPriceForProduct(
          "report",
          level,
          token.name.toLowerCase()
        );
        const { tokenPrice } = await getTokenPriceInfo(
          token.id === ERG_TOKEN_ID_MAP ? null : token.id
        );
        const required = Math.ceil(
          (discountedPrice / tokenPrice) *
            10 ** token.decimals *
            REPORT_PRICE_TOLERANCE
        );
        if (!Number.isFinite(required) || paid < BigInt(required)) {
          throw new Error(`Payment for transaction ${txId} is insufficient.`);
        }

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
          message: "Transaction confirmed and report has been updated",
        };
      } else if (transactionStatus.status === "PENDING") {
        return {
          status: "PENDING",
        };
      } else
        return {
          status: "NOT_FOUND",
          message: "Transaction not yet found on-chain. ",
        };
    }),
  editReportCustomName: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        customName: z.string(),
      })
    )
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
          code: "NOT_FOUND",
          message:
            "Report not found or you don't have permission to edit this report",
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

      return updatedReport;
    }),
  getReportDownloadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const report = await prisma.report.findFirst({
        where: {
          reportFilename: input.filename,
          userId: ctx.session.user.id,
        },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      return { url: `/api/files/reports/${input.filename}` };
    }),
});
