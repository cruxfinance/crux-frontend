-- CreateTable
CREATE TABLE "transactional_locks" (
    "id" TEXT NOT NULL,
    "lock" TEXT,
    "lease" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactional_locks_pkey" PRIMARY KEY ("id")
);
