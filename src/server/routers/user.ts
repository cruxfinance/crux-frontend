import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from "../trpc";
import { generateNonceForUser } from '../utils/nonce';

// const isErgoMainnetAddress = (value: string): boolean => {
//   const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
//   return value.startsWith('9') &&
//     value.length === 51 &&
//     [...value].every(char => base58Chars.includes(char));
// };

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

      const nonce = await generateNonceForUser(userAddress);

      return { nonce };
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

  // verifySignature: publicProcedure
  //   .input(z.object({
  //     addr: z.string(),
  //     message: z.string(),
  //     signature: z.string(),
  //   }))
  //   .query(async ({ input }) => {
  //     const { addr, message, signature } = input;

  //     if (!isErgoMainnetAddress(addr)) {
  //       return { error: "Invalid Ergo mainnet address" };
  //     }

  //     const ergoAddress = ergoWasm.Address.from_mainnet_str(addr);
  //     const textEncoder = new TextEncoder();
  //     const isValid = ergoWasm.verify_signature(ergoAddress, textEncoder.encode(message), textEncoder.encode(signature));

  //     if (isValid) {
  //       return { authenticated: true };
  //     } else {
  //       return { authenticated: false };
  //     }
  //   })
});