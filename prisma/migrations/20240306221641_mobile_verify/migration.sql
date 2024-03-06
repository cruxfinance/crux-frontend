-- DropIndex
DROP INDEX "wallets_change_address_key";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "addresses" TEXT[];

-- CreateTable
CREATE TABLE "mobile_verification" (
    "verificationId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "mobile_verification_pkey" PRIMARY KEY ("verificationId")
);

-- AddForeignKey
ALTER TABLE "mobile_verification" ADD CONSTRAINT "mobile_verification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
