ALTER TABLE "GameProfile" ADD COLUMN "killedMonsters" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "SanctuaryVisit" (
  "gameProfileId" INTEGER NOT NULL REFERENCES "GameProfile"("id") ON DELETE CASCADE,
  "sanctuaryId" INTEGER NOT NULL REFERENCES "Sanctuary"("id") ON DELETE CASCADE,
  "nextBlessingAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("gameProfileId", "sanctuaryId")
);
