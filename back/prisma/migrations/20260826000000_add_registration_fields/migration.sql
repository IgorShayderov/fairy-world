-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT NOT NULL;
ALTER TABLE "User" ADD COLUMN     "country" TEXT;
ALTER TABLE "User" ADD COLUMN     "city" TEXT;
ALTER TABLE "User" ADD COLUMN     "gender" "Gender";
ALTER TABLE "User" ADD COLUMN     "language" TEXT;
