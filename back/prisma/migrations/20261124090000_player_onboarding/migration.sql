BEGIN;

-- Existing players can replay the guide from Settings without being interrupted.
ALTER TABLE "GameProfile"
  ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT true;

-- Profiles created after this migration receive the first-time guide.
ALTER TABLE "GameProfile" ALTER COLUMN "onboardingCompleted" SET DEFAULT false;
ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_onboardingStep_check"
  CHECK ("onboardingStep" BETWEEN 0 AND 5);

COMMIT;
