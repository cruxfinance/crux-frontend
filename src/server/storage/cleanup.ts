import { prisma } from "@server/prisma";
import { deletePublicObject } from "./client";

/**
 * Best-effort deletion of all of a user's outstanding upload objects and
 * ledger rows. Intended to run immediately before the user row itself is
 * deleted, so orphaned objects don't linger in storage.
 */
export const deleteUserUploads = async (userId: string): Promise<void> => {
  const uploads = await prisma.userUpload.findMany({
    where: { userId, deletedAt: null },
  });

  for (const upload of uploads) {
    try {
      await deletePublicObject(upload.key);
      await prisma.userUpload.update({
        where: { key: upload.key },
        data: { deletedAt: new Date() },
      });
    } catch (e: any) {
      console.error("Error deleting user upload:", e?.message ?? e);
    }
  }
};
