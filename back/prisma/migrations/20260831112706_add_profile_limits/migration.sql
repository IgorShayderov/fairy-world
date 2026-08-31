-- This is an empty migration.
ALTER TABLE "GameProfile" ADD CONSTRAINT "check_level_limit" CHECK (level >= 1 AND level <= 100);

ALTER TABLE "GameProfile" ADD CONSTRAINT "check_gold_limit" CHECK (gold >= 0 AND gold <= 1000000);