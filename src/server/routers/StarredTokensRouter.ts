import { createTRPCRouter, protectedProcedure } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const starredTokensRouter = createTRPCRouter({
  getStarredTokens: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { starredTokens: true, privilegeLevel: true },
      });

      if (!user || (user.privilegeLevel !== 'BASIC' && user.privilegeLevel !== 'PRO' && user.privilegeLevel !== 'ADMIN')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This feature is only available for premium users',
        });
      }

      return user.starredTokens;
    }),

  updateStarredTokens: protectedProcedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { privilegeLevel: true },
      });

      if (!user || (user.privilegeLevel !== 'BASIC' && user.privilegeLevel !== 'PRO' && user.privilegeLevel !== 'ADMIN')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This feature is only available for premium users',
        });
      }

      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: { starredTokens: input },
        select: { starredTokens: true },
      });

      return updatedUser.starredTokens;
    }),
});