import { prisma } from '@server/prisma';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { generateNonceForUser } from '../utils/nonce';

export const authRouter = createTRPCRouter({
  initiateLogin: publicProcedure
    .input(z.object({
      address: z.string(),
    }))
    .mutation(async ({ input }) => {
      const verificationId = nanoid();
      const nonce = await generateNonceForUser(input.address); // this will create the user if one doesn't exist

      const user = await prisma.user.findUnique({
        where: { defaultAddress: input.address },
      });

      if (!user) {
        throw new Error(`ERR::login:: User account creation failed`);
      }

      if (!user.nonce) {
        throw new Error(`ERR::login:: Nonce not generated correctly`);
      }

      const existingLoginRequests = await prisma.loginRequest.findMany({
        where: { user_id: user.id },
      });

      for (const request of existingLoginRequests) {
        await prisma.loginRequest.delete({ where: { id: request.id } });
      }

      await prisma.loginRequest.create({
        data: {
          user_id: user.id,
          verificationId: verificationId as string,
          message: user.nonce,
          status: 'PENDING',
        },
      });

      return { verificationId, nonce };
    }),
  checkLoginStatus: publicProcedure
    .input(z.object({
      verificationId: z.string(),
    }))
    .query(async ({ input }) => {
      const loginRequest = await prisma.loginRequest.findUnique({
        where: { verificationId: input.verificationId },
      });

      if (!loginRequest) {
        throw new Error("Invalid verificationId");
      }

      if (loginRequest.status === 'PENDING') {
        return { status: 'PENDING' };
      }

      if (loginRequest.status === 'SIGNED') {
        return {
          status: 'SIGNED',
          signedMessage: loginRequest.signedMessage,
          proof: loginRequest.proof
        };
      }
    }),
});
