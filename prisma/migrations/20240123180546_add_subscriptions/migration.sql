-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CONFIRMED', 'PENDING', 'FAILED', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "PaymentInstrumentStatus" AS ENUM ('ACTIVE', 'IN_USE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAYMENT_PENDING', 'EXPIRED');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "payment_instrument_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_instruments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" BIGINT NOT NULL,
    "token_id" TEXT,
    "status" "PaymentInstrumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "payment_instrument_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactional_locks" (
    "id" TEXT NOT NULL,
    "lock" TEXT,
    "lease" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactional_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_instrument_id" TEXT NOT NULL,
    "required_amount_usd" BIGINT NOT NULL,
    "allowed_access" "UserPrivilegeLevel" NOT NULL DEFAULT 'BASIC',
    "period_seconds" INTEGER NOT NULL,
    "activation_timestamp" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_instrument_id_fkey" FOREIGN KEY ("payment_instrument_id") REFERENCES "payment_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_instruments" ADD CONSTRAINT "payment_instruments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_payment_instrument_id_fkey" FOREIGN KEY ("payment_instrument_id") REFERENCES "payment_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_instrument_id_fkey" FOREIGN KEY ("payment_instrument_id") REFERENCES "payment_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
