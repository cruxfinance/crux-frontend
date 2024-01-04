/*
  Warnings:

  - The primary key for the `LoginRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `wallets` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateEnum
CREATE TYPE "RecurringPaymentSourceStatus" AS ENUM ('CREATED', 'PENDING', 'ACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "LoginRequest" DROP CONSTRAINT "LoginRequest_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "LoginRequest_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "LoginRequest_id_seq";

-- AlterTable
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "wallets_id_seq";

-- CreateTable
CREATE TABLE "RecurringPaymentSource" (
    "id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "tokenId" TEXT,
    "periodSeconds" INTEGER NOT NULL,
    "transactionId" TEXT,
    "transactionConfirmationTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "RecurringPaymentSourceStatus" NOT NULL DEFAULT 'CREATED',

    CONSTRAINT "RecurringPaymentSource_pkey" PRIMARY KEY ("id")
);
