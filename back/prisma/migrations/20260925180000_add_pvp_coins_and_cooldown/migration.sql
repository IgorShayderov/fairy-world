-- AlterTable
ALTER TABLE "GameProfile" ADD COLUMN "coinsOfHonour" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameProfile" ADD COLUMN "pvpCooldownUntil" TIMESTAMP(3);
