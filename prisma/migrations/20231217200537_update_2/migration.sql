/*
  Warnings:

  - You are about to drop the column `tokenUrl` on the `ErgoAuthRequest` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ErgoAuthRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "signingMessage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ErgoAuthRequest" ("address", "createdAt", "id", "signingMessage", "updatedAt") SELECT "address", "createdAt", "id", "signingMessage", "updatedAt" FROM "ErgoAuthRequest";
DROP TABLE "ErgoAuthRequest";
ALTER TABLE "new_ErgoAuthRequest" RENAME TO "ErgoAuthRequest";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
