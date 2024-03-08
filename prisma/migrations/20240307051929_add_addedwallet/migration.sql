/*
  Warnings:

  - A unique constraint covering the columns `[change_address]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "added_wallets" (
    "id" TEXT NOT NULL,
    "type" TEXT,
    "change_address" TEXT NOT NULL,
    "unused_addresses" TEXT[],
    "used_addresses" TEXT[],
    "user_id" TEXT NOT NULL,

    CONSTRAINT "added_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "added_wallets_change_address_key" ON "added_wallets"("change_address");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_change_address_key" ON "wallets"("change_address");

-- AddForeignKey
ALTER TABLE "added_wallets" ADD CONSTRAINT "added_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
