import { prisma } from "@server/prisma";
import { createTRPCRouter, protectedProcedure } from "@server/trpc";
import { z } from "zod";

export const verifyRouter = createTRPCRouter({
  initVerification: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id

      // Delete stale verifications for any user, instead of using a CRON job. 
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      await prisma.mobileVerification.deleteMany({
        where: {
          createdAt: {
            lt: oneHourAgo,
          },
        },
      });

      const init = await prisma.mobileVerification.create({
        data: {
          userId
        }
      });
      return init.verificationId;
    }),
  getAddress: protectedProcedure
    .input(z.object({
      verificationId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const { verificationId } = input;
      const userId = ctx.session.user.id
      const entry = await prisma.mobileVerification.findUnique({
        where: {
          verificationId,
          userId
        }
      })
      if (entry) return entry.address;
    }),
})