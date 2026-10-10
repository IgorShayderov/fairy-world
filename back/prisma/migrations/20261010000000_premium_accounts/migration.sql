CREATE TABLE "PremiumAccount" (
  "id" SERIAL NOT NULL,
  "gameProfileId" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PremiumAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PremiumAccount_gameProfileId_key" ON "PremiumAccount"("gameProfileId");
CREATE INDEX "PremiumAccount_active_expiresAt_idx" ON "PremiumAccount"("active", "expiresAt");
ALTER TABLE "PremiumAccount" ADD CONSTRAINT "PremiumAccount_gameProfileId_fkey"
  FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
