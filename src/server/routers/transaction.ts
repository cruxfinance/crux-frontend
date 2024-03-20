import { checkLocalIcon } from '@lib/utils/icons';
import { prisma } from "@server/prisma";
import { getExchangeRate } from "@server/services/exchangeRateApi";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@server/trpc";
import { getUnsignedTransaction } from "@server/utils/ergoClient";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import { nanoid } from 'nanoid';
import { z } from "zod";

export const transactionRouter = createTRPCRouter({
  getTransaction: publicProcedure
    .input(z.object({
      address: z.string(),
      amount: z.array(z.object({
        tokenId: z.string(),
        amount: z.number()
      }))
    }))
    .mutation(async ({ input }) => {
      if (process.env.ADMIN_ADDRESS) {
        const tx = getUnsignedTransaction(input.address, process.env.ADMIN_ADDRESS, input.amount)
        return tx
      }
    }),
  initMobileTx: protectedProcedure
    .input(z.object({
      payment: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const key = `mobile-payment-${nanoid()}`
      const oneHourFromNow: Date = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
      const init = await prisma.keyValuePair.create({
        data: {
          key,
          value: input.payment,
          expiresAt: oneHourFromNow
        }
      })
      if (!init) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to access database. ",
        });
      }
      return key
    }),
  checkMobileScan: publicProcedure
    .input(z.object({
      verificationId: z.string()
    }))
    .query(async ({ input }) => {
      const { verificationId } = input;
      if (typeof verificationId === 'undefined') {
        throw new TRPCError({
          message: 'An id is required to check this item',
          code: 'BAD_REQUEST',
        });
      }

      try {
        const complete = await prisma.keyValuePair.findFirst({
          where: { key: verificationId },
        });

        let parsedValue;

        try {
          parsedValue = complete?.value ? JSON.parse(complete.value) : null;
        } catch (error) {
          console.error("Error parsing JSON from complete.value:", error);
          return null;
        }

        if (parsedValue && 'txId' in parsedValue) {
          return parsedValue.txId;
        } else {
          console.error("Transaction ID not present in the kv pair:");
          return null;
        }
      } catch (error) {
        console.error('Error verifying:', error);
        throw new TRPCError({
          message: `Failed to verify item ${verificationId}`,
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }),
  checkMobileSuccess: publicProcedure
    .input(z.object({
      transactionId: z.string()
    }))
    .query(async ({ input }) => {
      const { transactionId } = input
      const url = `/crux/tx_status/${transactionId}`
      const request = await axios.get((process.env.CRUX_API) + url);
      console.log(request.data)
      if (request.data.num_confirmations >= 0) {
        return request.data.num_confirmations
      }
      else return null
    }),
  fetchTokenInfoWithPrice: publicProcedure
    .input(z.object({
      tokenId: z.string()
    }))
    .query(async ({ input }) => {
      const { tokenId } = input
      try {
        const endpoint = `${process.env.CRUX_API}/crux/token_info/${tokenId}`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        });

        const data: TokenInfoApi = await response.json();
        const isLocalIcon = await checkLocalIcon(tokenId)
        const exchangeRate = await getExchangeRate()
        const thisTokenInfo = {
          name: data.token_name,
          ticker: data.token_name,
          tokenId: tokenId,
          icon: isLocalIcon ?? '',
          priceInErg: data.value_in_erg,
          priceInUsd: exchangeRate ? exchangeRate * data.value_in_erg : null
        };
        return thisTokenInfo
      } catch (error) {
        console.error('Error fetching token data:', error);
      }
    }),
})