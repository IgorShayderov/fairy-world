ALTER TABLE "Shop" ADD COLUMN "ownerId" INTEGER, ADD COLUMN "townId" INTEGER, ADD COLUMN "stockLevel" INTEGER;
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Shop_ownerId_townId_key" ON "Shop"("ownerId", "townId");
