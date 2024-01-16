/*
  Warnings:

  - Added the required column `amount` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'NOT_FOUND';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "amount" BIGINT NOT NULL;
