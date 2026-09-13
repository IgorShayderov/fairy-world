CREATE TABLE "Quest" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "monsterType" TEXT NOT NULL,
  "target" INTEGER NOT NULL CHECK ("target" > 0),
  "rewardGold" INTEGER NOT NULL CHECK ("rewardGold" >= 0)
);
CREATE TABLE "PlayerQuest" (
  "gameProfileId" INTEGER NOT NULL REFERENCES "GameProfile"("id") ON DELETE CASCADE,
  "questId" INTEGER NOT NULL REFERENCES "Quest"("id"),
  "townId" INTEGER NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0 CHECK ("progress" >= 0),
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  PRIMARY KEY ("gameProfileId", "questId")
);
INSERT INTO "Quest" ("code", "monsterType", "target", "rewardGold") VALUES
  ('wolf_hunt', 'Dire Wolf', 20, 200),
  ('goblin_raiders', 'Goblin Raider', 10, 100),
  ('safe_roads', '*', 30, 250);
