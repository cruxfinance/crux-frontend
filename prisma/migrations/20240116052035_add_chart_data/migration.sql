/*
  Warnings:

  - A unique constraint covering the columns `[user_id,symbol]` on the table `ChartData` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ChartData_user_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "ChartData_user_id_symbol_key" ON "ChartData"("user_id", "symbol");
