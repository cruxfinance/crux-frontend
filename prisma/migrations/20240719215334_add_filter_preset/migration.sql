-- CreateTable
CREATE TABLE "filter_preset" (
    "id" TEXT NOT NULL,
    "preset_name" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "sort_by" TEXT,
    "sort_order" TEXT,
    "price_min" TEXT,
    "price_max" TEXT,
    "liquidity_min" TEXT,
    "liquidity_max" TEXT,
    "market_cap_min" TEXT,
    "market_cap_max" TEXT,
    "pct_change_min" TEXT,
    "pct_change_max" TEXT,
    "volume_min" TEXT,
    "volume_max" TEXT,
    "buys_min" INTEGER,
    "buys_max" INTEGER,
    "sells_min" INTEGER,
    "sells_max" INTEGER,
    "currency" TEXT,
    "search_string" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "filter_preset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "filter_preset" ADD CONSTRAINT "filter_preset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
