import { prisma } from '@server/prisma';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  getNonce: publicProcedure
    .input(z.object({
      userAddress: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { userAddress } = input;

      if (!userAddress) {
        return { nonce: null }; // Return a default value or error if the input is not defined
      }

      // Check if a user with the given address already exists
      let user = await prisma.user.findUnique({
        where: { rewardAddress: userAddress },
      });

      // If the user doesn't exist, create a new user model in the database
      if (!user) {
        user = await prisma.user.create({
          data: {
            rewardAddress: userAddress,
            // Include any other fields you want to set here
          },
        });
      }

      // const nonce = generateNonce('Sign to login: ');

      // Update the user's nonce in the database
      await prisma.user.update({
        where: { id: user.id },
        data: {},
      });

      return {};
    }),
  // getUserWalletType: protectedProcedure
  //   .input(z.object({})) // No input required if you're getting the userId from the session
  //   .query(async ({ ctx }) => { // Access the context object
  //     const userId = ctx.session?.user.id; // Get userId from the session

  //     if (!userId) {
  //       throw new Error('User ID not found in session'); // Handle the case where userId is not defined
  //     }

  //     // Query the database using Prisma to get the user's default wallet type by their ID
  //     const user = await prisma.user.findUnique({
  //       where: { id: userId },
  //       select: { defaultWalletType: true }
  //     });

  //     // Return the default wallet type
  //     return user?.defaultWalletType;
  //   }),
});