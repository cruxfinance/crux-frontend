-- CreateEnum
CREATE TYPE "UserPrivilegeLevel" AS ENUM ('DEFAULT', 'BASIC', 'PRO', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "privilegeLevel" "UserPrivilegeLevel" NOT NULL DEFAULT 'DEFAULT';
