import { prisma } from "@server/prisma";
import { deleteUserUploads } from "@server/storage/cleanup";

type DeleteEmptyUserResponse = {
  success?: boolean;
  error?: string;
};

export const deleteEmptyUser = async (
  userId: string
): Promise<DeleteEmptyUserResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      wallets: true,
      accounts: true,
      sessions: true,
    },
  });

  if (!user) {
    return { error: "User not found" };
  }

  if (
    user.wallets.length === 0 &&
    user.accounts.length === 0 &&
    user.sessions.length === 0 &&
    user.status === "pending"
  ) {
    try {
      await deleteUserUploads(userId);
    } catch (e: any) {
      console.error("Error cleaning up user uploads:", e?.message ?? e);
    }

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
    return { success: true };
  } else {
    return { error: "User account not empty" };
  }
};
