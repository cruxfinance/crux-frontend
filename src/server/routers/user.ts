import { verifySignature } from "@server/auth";
import { prisma } from "@server/prisma";
import { checkAddressAvailability } from "@server/utils/checkAddress";
import { deleteEmptyUser } from "@server/utils/deleteEmptyUser";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { generateNonceForLogin } from "../utils/nonce";
import { getCurrentUpdatedSubcription } from "@server/services/subscription/subscription";
import { uploadFile } from "@server/utils/s3";

export const userRouter = createTRPCRouter({
  getNonce: publicProcedure
    .input(
      z.object({
        userAddress: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { userAddress } = input;
      if (!userAddress) {
        return { nonce: null }; // Return a default value or error if the input is not defined
      }
      const nonce = await generateNonceForLogin(userAddress);
      if (!nonce) {
        throw new Error("Address already in use by another user account");
      }
      return { nonce };
    }),
  getNonceProtected: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    const nonce = nanoid();
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { nonce },
    });
    if (!updatedUser) {
      throw new Error("Unable to generate nonce");
    }
    return { nonce };
  }),
  checkAddressAvailable: publicProcedure
    .input(
      z.object({
        address: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { address } = input;

      if (!address) {
        return { status: "error", message: "Address not provided" };
      }

      const result = await checkAddressAvailability(address);
      if (result.status === "unavailable") {
        return {
          status: "unavailable",
          message: "Address is in use",
        };
      }

      return { status: "available", message: "Address is not in use" };
    }),
  addAddress: protectedProcedure
    .input(
      z.object({
        nonce: z.string(),
        address: z.string(),
        signature: z.object({
          signedMessage: z.string(),
          proof: z.string(),
        }),
        wallet: z.object({
          type: z.string(),
          defaultAddress: z.string(),
          usedAddresses: z.string().array().optional(),
          unusedAddresses: z.string().array().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { address, nonce, signature, wallet } = input;
      const { type, defaultAddress, usedAddresses, unusedAddresses } = wallet;
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new Error("User not found in database");
      }

      if (type === "nautilus") {
        const signedMessageSplit = signature.signedMessage.split(";");
        const nonce = signedMessageSplit[0];
        const url = signedMessageSplit[1];
        if (nonce !== user.nonce) {
          console.error(`Nonce doesn't match`);
          throw new Error(`Nonce doesn't match`);
        }
      } else if (type === "mobile") {
        const nonce = signature.signedMessage.slice(20, 41);
        const url = signature.signedMessage.slice(41, -20);

        if (nonce !== user.nonce) {
          console.error(`Nonce doesn't match`);
          throw new Error(`Nonce doesn't match`);
        }
      } else {
        throw new Error("Unrecognized wallet type");
      }

      const verified = verifySignature(
        address,
        signature.signedMessage,
        signature.proof,
        wallet.type
      );
      if (verified) {
        // Construct update data
        const updateData: {
          wallets: any;
          defaultAddress?: string;
        } = {
          wallets: {
            create: {
              type,
              changeAddress: address,
              usedAddresses,
              unusedAddresses,
            },
          },
        };

        // If the user does not have a default address, then set it.
        if (!user.defaultAddress) {
          updateData.defaultAddress = address;
        }

        try {
          return await prisma.user.update({
            where: {
              id: userId,
            },
            data: updateData,
          });
        } catch (prismaError) {
          console.error("Prisma error:", prismaError);
          throw new Error("Failed to update user and create wallet.");
        }
      }
      throw new Error("User not updated in db");
    }),
  initAddWallet: protectedProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const verificationId = nanoid();
      const nonce = nanoid();

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { nonce },
      });

      if (!updatedUser) {
        throw new Error("Unable to add nonce to user in database");
      }

      const isAvailable = await checkAddressAvailability(input.address);

      if (isAvailable.status !== "available") {
        throw new Error("Address in use by another wallet");
      }

      const existingLoginRequests = await prisma.loginRequest.findMany({
        where: { userId: userId },
      });

      for (const request of existingLoginRequests) {
        await prisma.loginRequest.delete({ where: { id: request.id } });
      }

      await prisma.loginRequest.create({
        data: {
          userId: userId,
          verificationId: verificationId as string,
          message: nonce,
          status: "PENDING",
        },
      });

      return { verificationId, nonce };
    }),
  getWallets: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        wallets: true,
      },
    });
    return user;
  }),
  changeDefaultAddress: protectedProcedure
    .input(
      z.object({
        newDefault: z.string(),
        walletId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { newDefault, walletId } = input;

      // Fetch the wallet's associated addresses
      const wallet = await prisma.wallet.findUnique({
        where: {
          id: walletId,
          userId: userId,
        },
        select: {
          changeAddress: true,
          unusedAddresses: true,
          usedAddresses: true,
        },
      });

      if (!wallet) {
        throw new Error("Wallet does not match user");
      }

      // Combine all the addresses associated with the wallet
      const allWalletAddresses = [
        wallet.changeAddress,
        ...wallet.unusedAddresses,
        ...wallet.usedAddresses,
      ];

      // Fetch the user's current default address
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          defaultAddress: true,
        },
      });

      // If the user's default address is in the list of all wallet addresses, update it to the new address
      if (
        user!.defaultAddress &&
        allWalletAddresses.includes(user!.defaultAddress)
      ) {
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            defaultAddress: newDefault,
          },
        });
      }

      // Update the wallet's change address
      await prisma.wallet.update({
        where: {
          id: walletId,
          userId: userId,
        },
        data: {
          changeAddress: newDefault,
        },
      });

      return { success: true };
    }),
  // Change the default user address. This is used for things like airdrops.
  // Note: the user can login with any wallet, so change Login address is not the best name
  changeLoginAddress: protectedProcedure
    .input(
      z.object({
        changeAddress: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { changeAddress } = input;

      // Verify that the provided changeAddress belongs to a wallet of the current user
      const wallet = await prisma.wallet.findFirst({
        where: {
          changeAddress: changeAddress,
          userId: userId,
        },
        select: {
          id: true, // just selecting id for brevity; we just want to know if a record exists
        },
      });

      if (!wallet) {
        throw new Error(
          "The provided address does not belong to any of the user's wallets"
        );
      }

      // Update the user's defaultAddress with the provided changeAddress
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          defaultAddress: changeAddress,
        },
      });

      return { success: true };
    }),
  removeWallet: protectedProcedure
    .input(
      z.object({
        walletId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const userAddress = ctx.session.user.address;
      const walletId = input.walletId;

      // check if wallet belongs to this user
      const wallet = await prisma.wallet.findUnique({
        where: {
          id: walletId,
          userId: userId,
        },
      });

      if (!wallet) {
        throw new Error("Wallet not found or doesn't belong to this user");
      }

      // Check if userAddress exists in any of the address fields of the fetched wallet
      if (
        userAddress &&
        wallet.changeAddress !== userAddress &&
        !wallet.unusedAddresses.includes(userAddress) &&
        !wallet.usedAddresses.includes(userAddress)
      ) {
        // Attempt to delete the wallet
        const deleteResponse = await prisma.wallet.delete({
          where: {
            id: walletId,
          },
        });
        if (!deleteResponse) {
          throw new Error("Error removing this wallet");
        }
        return { success: true }; // Return a success response or any other relevant data
      } else
        throw new Error(
          "Cannot delete: wallet is currently the default address for this user"
        );
    }),
  getUserDetails: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("Unable to find user in database");
    }

    return user;
  }),
  changeUserDetails: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().optional(),
        email: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { name, image, email } = input;

      // Prepare the data object for the update
      const updateData: any = {};

      // Conditionally add fields to the updateData object
      if (name) {
        updateData.name = name;
      }
      if (email) {
        updateData.email = email;
      }
      if (image) {
        updateData.image = image;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      if (!updatedUser) {
        throw new Error("Error updating user profile");
      }

      return { success: true };
    }),
  deleteEmptyUser: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const deleteUser = await deleteEmptyUser(input.userId);
      if (deleteUser.success) return { success: true };
      else return { error: deleteUser.error };
    }),
  deleteUserAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // clear all wallets associated with the user
    await prisma.wallet.deleteMany({
      where: {
        userId: userId,
      },
    });

    const deleteUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: "deleted",
        defaultAddress: "",
      },
    });
    if (!deleteUser) {
      throw new Error("Error deleting user");
    }
    return { success: true }; // Return a success response or any other relevant data
  }),
  refreshAccessLevel: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    await getCurrentUpdatedSubcription(userId);
    return { success: true };
  }),
  uploadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        encodedFile: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const type = input.fileName.split(".").pop() ?? "";
      const updatedFileName = nanoid() + "." + type;
      return await uploadFile(updatedFileName, input.encodedFile);
    }),
});
