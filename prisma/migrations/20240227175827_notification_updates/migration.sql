-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PAID', 'EXPIRED');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "report_filename" TEXT NOT NULL,
    "formats" TEXT[],
    "availability" "ReportStatus" NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
