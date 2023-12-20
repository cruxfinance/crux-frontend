/*
  Warnings:

  - You are about to drop the column `session_state` on the `accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "session_state",
ADD COLUMN     "sessionState" TEXT;
