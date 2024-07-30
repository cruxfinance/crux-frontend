-- AlterTable
ALTER TABLE "users" ADD COLUMN     "starredTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];
