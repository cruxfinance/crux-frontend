import {
  getNotification,
  getNotifications,
  markAllAsRead,
  markNotifcationAsRead,
} from "@server/services/notification/notification";
import { createTRPCRouter, protectedProcedure } from "@server/trpc";
import { z } from "zod";

export const notificationRouter = createTRPCRouter({
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const notifcations = await getNotifications(ctx.session.user.id);
    return notifcations;
  }),
  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notifcation = await getNotification(input.notificationId);
      if (notifcation.userId !== ctx.session.user.id) {
        throw new Error(
          `User ${ctx.session.user.id} not authorized to access Notification ${input.notificationId}.`
        );
      }
      return await markNotifcationAsRead(input.notificationId);
    }),
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return await markAllAsRead(ctx.session.user.id);
  }),
});
