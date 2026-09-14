CREATE TABLE "QuestBoard" (
  "id" TEXT PRIMARY KEY,
  "gameProfileId" INTEGER NOT NULL REFERENCES "GameProfile"("id") ON DELETE CASCADE,
  "townId" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "nextRefreshAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("gameProfileId", "townId")
);
ALTER TABLE "Quest" ADD COLUMN "boardId" TEXT REFERENCES "QuestBoard"("id"),
  ADD COLUMN "boardRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rewardExperience" INTEGER NOT NULL DEFAULT 0;
UPDATE "Quest" SET "rewardExperience" = "target" * 20;
INSERT INTO "Sanctuary" ("id", "name", "x", "y", "buffType", "buffValue", "durationMinutes")
VALUES (3, 'SUNSPIRE', 1200, 330, 'DAMAGE', 5, 240);
