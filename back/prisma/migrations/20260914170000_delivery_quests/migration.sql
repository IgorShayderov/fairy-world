ALTER TABLE "Quest" ADD COLUMN "destinationTownId" INTEGER;
-- Offer the new mix on the next visit; accepted quests are preserved.
UPDATE "QuestBoard" SET "nextRefreshAt" = CURRENT_TIMESTAMP;
