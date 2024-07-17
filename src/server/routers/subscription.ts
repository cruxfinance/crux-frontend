import {
  addPaymentInstrumentBalance,
  createPaymentInstrument,
  findPaymentInstruments,
  getPaymentInstrument
} from "@server/services/subscription/paymentInstrument";
import {
  createSubscription,
  findSubscriptions,
  getSubscription,
  getSubscriptionUpdateParams,
  renewSubscription,
  updateSubscription,
} from "@server/services/subscription/subscription";
import { createTRPCRouter, protectedProcedure } from "@server/trpc";
import { z } from "zod";

const allowedTokens = [
  null, // erg
  "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365", // CRUX
  "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04", // SigUSD
];

export const subscriptionRouter = createTRPCRouter({
  // Find Stuff
  findPaymentInstruments: protectedProcedure.query(async ({ ctx }) => {
    const paymentInstruments = await findPaymentInstruments(
      ctx.session.user.id
    );
    return paymentInstruments;
  }),
  findSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await findSubscriptions(ctx.session.user.id);
    return subscriptions;
  }),
  findOrCreateDefaultPaymentInstruments: protectedProcedure.query(
    async ({ ctx }) => {
      const paymentInstruments = await findPaymentInstruments(
        ctx.session.user.id
      );
      if (paymentInstruments.length !== 0) {
        return paymentInstruments;
      }
      await Promise.all(
        allowedTokens.map((token) => {
          return createPaymentInstrument({
            userId: ctx.session.user.id,
            tokenId: token,
          });
        })
      );
      const updatedPaymentInstruments = await findPaymentInstruments(
        ctx.session.user.id
      );
      return updatedPaymentInstruments;
    }
  ),
  findActiveSubscripion: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await findSubscriptions(ctx.session.user.id);
    const activeSubscription =
      [...subscriptions].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      )[0] ?? null;
    return activeSubscription;
  }),
  // Payment Instruments
  getPaymentInstrument: protectedProcedure
    .input(
      z.object({
        paymentInstrumentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const paymentInstrumentId = input.paymentInstrumentId;
      const userId = ctx.session.user.id;
      const paymentInstrument = await getPaymentInstrument(paymentInstrumentId);
      if (paymentInstrument.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access PaymentInstrument ${paymentInstrumentId}.`
        );
      }
      return paymentInstrument;
    }),
  createPaymentInstrument: protectedProcedure
    .input(z.object({ tokenId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const paymentInstrument = await createPaymentInstrument({
        userId: ctx.session.user.id,
        tokenId: input.tokenId ?? null,
      });
      return paymentInstrument;
    }),
  addPaymentInstrumentBalance: protectedProcedure
    .input(
      z.object({
        paymentInstrumentId: z.string(),
        address: z.string(),
        amount: z.number(),
        txId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const paymentInstrumentId = input.paymentInstrumentId;
      const userId = ctx.session.user.id;
      const paymentInstrument = await getPaymentInstrument(paymentInstrumentId);
      if (paymentInstrument.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access PaymentInstrument ${paymentInstrumentId}.`
        );
      }
      const result = await addPaymentInstrumentBalance({
        paymentInstrumentId: paymentInstrumentId,
        address: input.address,
        amount: input.amount,
        txId: input.txId,
      });
      return result;
    }),
  // Subscriptions
  getSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const subscriptionId = input.subscriptionId;
      const userId = ctx.session.user.id;
      const subscription = await getSubscription(subscriptionId);
      if (subscription.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access Subscription ${subscriptionId}.`
        );
      }
      return subscription;
    }),
  createSubscription: protectedProcedure
    .input(
      z.object({
        paymentInstrumentId: z.string(),
        subscriptionConfigId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const paymentInstrumentId = input.paymentInstrumentId;
      const userId = ctx.session.user.id;
      const paymentInstrument = await getPaymentInstrument(paymentInstrumentId);
      if (paymentInstrument.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access PaymentInstrument ${paymentInstrumentId}.`
        );
      }
      const subscription = await createSubscription({
        userId: userId,
        paymentInstrumentId: paymentInstrumentId,
        subscriptionConfigId: input.subscriptionConfigId,
      });
      return subscription;
    }),
  renewSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const subscriptionId = input.subscriptionId;
      const userId = ctx.session.user.id;
      const subscription = await getSubscription(subscriptionId);
      if (subscription.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access Subscription ${subscriptionId}.`
        );
      }
      const result = await renewSubscription(subscriptionId);
      return result;
    }),
  getUpdateSubscriptionParams: protectedProcedure
    .input(
      z.object({
        activeSubscriptionId: z.string(),
        updateSubscriptionConfigId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const subscriptionId = input.activeSubscriptionId;
      const userId = ctx.session.user.id;
      const subscription = await getSubscription(subscriptionId);
      if (subscription.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access Subscription ${subscriptionId}.`
        );
      }
      return await getSubscriptionUpdateParams({
        activeSubscriptionId: input.activeSubscriptionId,
        updateSubscriptionConfigId: input.updateSubscriptionConfigId,
        paymentInstrumentId: "",
      });
    }),
  updateSubscription: protectedProcedure
    .input(
      z.object({
        activeSubscriptionId: z.string(),
        updateSubscriptionConfigId: z.string(),
        paymentInstrumentId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const subscriptionId = input.activeSubscriptionId;
      const paymentInstrumentId = input.paymentInstrumentId;
      const userId = ctx.session.user.id;
      const subscription = await getSubscription(subscriptionId);
      if (subscription.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access Subscription ${subscriptionId}.`
        );
      }
      const paymentInstrument = await getPaymentInstrument(paymentInstrumentId);
      if (paymentInstrument.userId !== userId) {
        throw new Error(
          `User ${userId} not authorized to access PaymentInstrument ${paymentInstrumentId}.`
        );
      }
      return await updateSubscription({
        activeSubscriptionId: input.activeSubscriptionId,
        updateSubscriptionConfigId: input.updateSubscriptionConfigId,
        paymentInstrumentId: input.paymentInstrumentId,
      });
    }),
});
