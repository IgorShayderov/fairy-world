-- Create Monster table
CREATE TABLE "Monster" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "level" INTEGER NOT NULL DEFAULT 1,
  "rewardGold" INTEGER NOT NULL DEFAULT 0,
  "rewardExperience" INTEGER NOT NULL DEFAULT 0,
  "icon" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Monster_name_idx" ON "Monster" ("name");

-- Create MonsterAttribute join table (monster -> attribute, value Int)
CREATE TABLE "MonsterAttribute" (
  "monsterId" INTEGER NOT NULL,
  "attributeId" INTEGER NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "MonsterAttribute_pkey" PRIMARY KEY ("monsterId", "attributeId"),
  CONSTRAINT "MonsterAttribute_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster" ("id") ON DELETE CASCADE,
  CONSTRAINT "MonsterAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute" ("id") ON DELETE CASCADE
);

CREATE INDEX "MonsterAttribute_attributeId_idx" ON "MonsterAttribute" ("attributeId");
