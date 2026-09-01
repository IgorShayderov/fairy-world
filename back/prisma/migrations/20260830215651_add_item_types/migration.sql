/*
  Warnings:

  - The `gender` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('QUEST', 'COMMON', 'MAGIC', 'RARE', 'UNIQUE');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('WEAPON', 'SHIELD', 'BODY', 'HELMET', 'BOOTS', 'GLOVES', 'LEGS', 'RING', 'AMULET', 'SCROLL', 'POTION', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "equipmentType" "EquipmentType"[] DEFAULT ARRAY['UNKNOWN']::"EquipmentType"[],
ADD COLUMN     "rarity" "ItemRarity" NOT NULL DEFAULT 'COMMON';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender";
