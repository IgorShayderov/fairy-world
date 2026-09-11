ALTER TABLE "GameProfile"
ADD COLUMN "gems" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "GameProfile_gems_nonnegative" CHECK ("gems" >= 0);
