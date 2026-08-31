/*
  Warnings:

  - Added the required column `isEquiped` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slot` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "isEquiped" BOOLEAN NOT NULL,
ADD COLUMN     "slot" INTEGER NOT NULL;
