/*
  Warnings:

  - You are about to drop the `idempotency_keys` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "idempotency_keys";

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "payment_instrument_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_payment_instrument_id_fkey" FOREIGN KEY ("payment_instrument_id") REFERENCES "payment_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
