import { prisma } from "@server/prisma";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { Address, verify_signature } from "ergo-lib-wasm-nodejs";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const requestId = nanoid();
      // todo: seed from env
      const signingMessage = `${nanoid()}_${Date.now().toString()}`;
      const ergoAuthRequest = await prisma.ergoAuthRequest.create({
        data: {
          id: requestId,
          address: input.address,
          signingMessage: signingMessage,
        },
      });
      return ergoAuthRequest;
    }),
  verify: publicProcedure
    .input(
      z.object({
        requestId: z.string(),
        proof: z.string(),
        signedMessage: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const ergoAuthRequest = await prisma.ergoAuthRequest.findFirst({
        where: {
          id: input.requestId,
        },
      });
      if (!ergoAuthRequest) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to verify message signature",
        });
      }
      const verified = verifySignature(
        ergoAuthRequest.address,
        ergoAuthRequest.signingMessage,
        input.signedMessage,
        input.proof
      );
      // todo: implement users
      return verified;
    }),
});

const verifySignature = (
  address: string,
  message: string,
  signedMessage: string,
  proof: string
) => {
  if (!signedMessage.includes(message)) return false;
  const ergoAddress = Address.from_mainnet_str(address);
  const messageBytes = Buffer.from(signedMessage, "utf-8");
  const proofBytes = Buffer.from(proof, "hex");
  const result = verify_signature(ergoAddress, messageBytes, proofBytes);
  return result;
};
