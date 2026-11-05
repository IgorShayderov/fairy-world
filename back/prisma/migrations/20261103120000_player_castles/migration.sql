CREATE TABLE "Castle" (
  "id" TEXT NOT NULL, "profileId" INTEGER NOT NULL, "name" VARCHAR(40) NOT NULL,
  "x" DOUBLE PRECISION NOT NULL, "y" DOUBLE PRECISION NOT NULL, "city" TEXT NOT NULL,
  "keep" INTEGER NOT NULL DEFAULT 1, "lumberMill" INTEGER NOT NULL DEFAULT 0,
  "quarry" INTEGER NOT NULL DEFAULT 0, "storehouse" INTEGER NOT NULL DEFAULT 0,
  "barracks" INTEGER NOT NULL DEFAULT 0, "forge" INTEGER NOT NULL DEFAULT 0,
  "wood" DOUBLE PRECISION NOT NULL DEFAULT 200, "stone" DOUBLE PRECISION NOT NULL DEFAULT 150,
  "producedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "construction" TEXT, "constructionEndsAt" TIMESTAMP(3),
  "sentinels" INTEGER NOT NULL DEFAULT 0, "rangers" INTEGER NOT NULL DEFAULT 0, "arcanists" INTEGER NOT NULL DEFAULT 0,
  "training" TEXT, "trainingCount" INTEGER NOT NULL DEFAULT 0, "trainingEndsAt" TIMESTAMP(3),
  "rating" INTEGER NOT NULL DEFAULT 100, "victories" INTEGER NOT NULL DEFAULT 0,
  "raidTarget" TEXT, "raidSentinels" INTEGER NOT NULL DEFAULT 0, "raidRangers" INTEGER NOT NULL DEFAULT 0,
  "raidArcanists" INTEGER NOT NULL DEFAULT 0, "raidPower" INTEGER NOT NULL DEFAULT 0,
  "raidEndsAt" TIMESTAMP(3), "raidCooldownUntil" TIMESTAMP(3), "protectedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Castle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Castle_resources_nonnegative" CHECK ("wood" >= 0 AND "stone" >= 0),
  CONSTRAINT "Castle_army_nonnegative" CHECK ("sentinels" >= 0 AND "rangers" >= 0 AND "arcanists" >= 0)
);
CREATE UNIQUE INDEX "Castle_profileId_key" ON "Castle"("profileId");
CREATE INDEX "Castle_rating_victories_idx" ON "Castle"("rating" DESC, "victories" DESC);
CREATE INDEX "Castle_raidEndsAt_idx" ON "Castle"("raidEndsAt");
ALTER TABLE "Castle" ADD CONSTRAINT "Castle_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "CastleReport" (
  "id" TEXT NOT NULL, "castleId" TEXT NOT NULL, "target" TEXT NOT NULL, "victory" BOOLEAN NOT NULL, "kind" TEXT NOT NULL DEFAULT 'ATTACK',
  "wood" INTEGER NOT NULL, "stone" INTEGER NOT NULL,
  "lostSentinels" INTEGER NOT NULL, "lostRangers" INTEGER NOT NULL, "lostArcanists" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CastleReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CastleReport_castleId_createdAt_idx" ON "CastleReport"("castleId", "createdAt" DESC);
ALTER TABLE "CastleReport" ADD CONSTRAINT "CastleReport_castleId_fkey" FOREIGN KEY ("castleId") REFERENCES "Castle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
