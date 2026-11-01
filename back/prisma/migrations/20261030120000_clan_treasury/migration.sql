ALTER TABLE "Clan"
  ADD COLUMN "treasuryGold" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "treasuryGems" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClanMember" ADD COLUMN "contributedGems" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Clan" ADD CONSTRAINT "Clan_treasury_nonnegative"
  CHECK ("treasuryGold" >= 0 AND "treasuryGems" >= 0);
