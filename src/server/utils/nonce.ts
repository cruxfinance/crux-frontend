import { prisma } from "@server/prisma";
import { nanoid } from "nanoid";
import { getUserIdByAddresses } from "./checkAddress";

export async function generateNonceForLogin(
  userAddress: string,
  allAddresses?: string[],
) {
  // First, check if a user exists with the given userAddress as the defaultAddress.
  let user = await prisma.user.findUnique({
    where: { defaultAddress: userAddress },
  });

  // If no user exists with the defaultAddress, search by all provided addresses in a single batch query
  if (!user) {
    const addressesToSearch = allAddresses?.length
      ? [...new Set(allAddresses)]
      : [userAddress];

    const userId = await getUserIdByAddresses(addressesToSearch);
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
      });
    }
  }

  // If still no user found, then create a new one
  if (!user) {
    user = await prisma.user.create({
      data: {
        defaultAddress: userAddress,
        status: "pending",
      },
    });
  }

  if (!user) {
    throw new Error("Database error");
  }

  const nonce = nanoid();

  // Update the user's nonce in the database
  await prisma.user.update({
    where: { id: user.id },
    data: { nonce },
  });

  return { nonce, userId: user.id };
}

export async function generateNonceForAddWallet(userId: string) {
  const nonce = nanoid();

  // Update the user's nonce in the database
  const user = await prisma.user.update({
    where: { id: userId },
    data: { nonce },
  });

  if (!user) {
    throw new Error("User doesn't exist");
  }

  return nonce;
}
