/*
  Warnings:

  - You are about to drop the column `consumable` on the `Item` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LocationVariant" AS ENUM ('CITY', 'DUNGEON', 'FOREST', 'VILLAGE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('BATTLE', 'QUEST', 'ENCOUNTER');

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "consumable",
ADD COLUMN     "isConsumable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "variant" "LocationVariant" NOT NULL,
    "eventType" "EventType" NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsersLocation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "isForced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UsersLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsersLocation_userId_key" ON "UsersLocation"("userId");

-- AddForeignKey
ALTER TABLE "UsersLocation" ADD CONSTRAINT "UsersLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsersLocation" ADD CONSTRAINT "UsersLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
