-- CreateTable
CREATE TABLE "user_uploads" (
    "key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_uploads_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "user_uploads_user_id_created_at_idx" ON "user_uploads"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_uploads" ADD CONSTRAINT "user_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

