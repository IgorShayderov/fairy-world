/*
  Warnings:

  - You are about to drop the column `userId` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gold` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gameProfileId,itemId]` on the table `InventoryItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gameProfileId` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_userId_fkey";

-- DropIndex
DROP INDEX "InventoryItem_userId_itemId_key";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "userId",
ADD COLUMN     "gameProfileId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "experience",
DROP COLUMN "gold",
DROP COLUMN "level";

-- CreateTable
CREATE TABLE "GameProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameProfile_userId_key" ON "GameProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_gameProfileId_itemId_key" ON "InventoryItem"("gameProfileId", "itemId");

-- AddForeignKey
ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
