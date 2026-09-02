-- Create monster rarity enum
CREATE TYPE "MonsterRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'ELITE', 'BOSS');

-- Create Monster table
CREATE TABLE "Monster" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "rarity" "MonsterRarity" NOT NULL DEFAULT 'COMMON',
  "level" INTEGER NOT NULL DEFAULT 1,
  "health" INTEGER NOT NULL DEFAULT 10,
  "attack" INTEGER NOT NULL DEFAULT 5,
  "defense" INTEGER NOT NULL DEFAULT 2,
  "rewardGold" INTEGER NOT NULL DEFAULT 0,
  "rewardExperience" INTEGER NOT NULL DEFAULT 0,
  "icon" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Monster_name_idx" ON "Monster" ("name");
