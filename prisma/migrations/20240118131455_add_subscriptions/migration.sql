-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAYMENT_PENDING', 'EXPIRED');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_instrument_id" TEXT NOT NULL,
    "required_amount_usd" BIGINT NOT NULL,
    "allowed_access" "UserPrivilegeLevel" NOT NULL DEFAULT 'BASIC',
    "period_seconds" INTEGER NOT NULL,
    "activation_timestamp" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_instrument_id_fkey" FOREIGN KEY ("payment_instrument_id") REFERENCES "payment_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
