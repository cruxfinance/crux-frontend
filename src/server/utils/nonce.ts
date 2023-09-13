import { prisma } from '@server/prisma';
import { nanoid } from 'nanoid';

export async function generateNonceForUser(userAddress: string) {
  // TODO, check wallets of existing users recursively 
  // ensure there isn't another user account for this wallet
  // if there is, throw a warning/error 
  // "User already exists with this wallet, please login using the existing account or choose a unique wallet"

  // Check if a user with the given address already exists
  let user = await prisma.user.findUnique({
    where: { defaultAddress: userAddress },
  });

  // If the user doesn't exist, create a new user model in the database
  if (!user) {
    user = await prisma.user.create({
      data: {
        defaultAddress: userAddress,
      },
    });
  }

  const nonce = nanoid();

  // Update the user's nonce in the database
  await prisma.user.update({
    where: { id: user.id },
    data: { nonce },
  });

  return nonce;
}