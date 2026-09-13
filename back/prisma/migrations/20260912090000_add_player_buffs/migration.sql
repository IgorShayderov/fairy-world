CREATE TYPE "PlayerBuffType" AS ENUM ('DAMAGE', 'DEFENSE', 'EXPERIENCE');

CREATE TABLE "GameProfileBuff" (
    "id" SERIAL NOT NULL,
    "gameProfileId" INTEGER NOT NULL,
    "type" "PlayerBuffType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameProfileBuff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameProfileBuff_gameProfileId_type_key"
ON "GameProfileBuff"("gameProfileId", "type");

CREATE INDEX "GameProfileBuff_expiresAt_idx"
ON "GameProfileBuff"("expiresAt");

ALTER TABLE "GameProfileBuff"
ADD CONSTRAINT "GameProfileBuff_gameProfileId_fkey"
FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Item" SET "description" = 'Increases experience gained by 10% for 4 hours.'
WHERE "name" = 'Lesser Experience Potion';
UPDATE "Item" SET "description" = 'Increases experience gained by 25% for 4 hours.'
WHERE "name" = 'Mild Experience Potion';
UPDATE "Item" SET "description" = 'Increases experience gained by 50% for 4 hours.'
WHERE "name" = 'Higher Experience Potion';
UPDATE "Item" SET "description" = 'Increases Damage by 5 for 4 hours.'
WHERE "name" = 'Lesser Attack Potion';
UPDATE "Item" SET "description" = 'Increases Damage by 15 for 4 hours.'
WHERE "name" = 'Mild Attack Potion';
UPDATE "Item" SET "description" = 'Increases Damage by 50 for 4 hours.'
WHERE "name" = 'Higher Attack Potion';
UPDATE "Item" SET "description" = 'Increases Defense rating by 5 for 4 hours.'
WHERE "name" = 'Lesser Defense Potion';
UPDATE "Item" SET "description" = 'Increases Defense rating by 15 for 4 hours.'
WHERE "name" = 'Mild Defense Potion';
UPDATE "Item" SET "description" = 'Increases Defense rating by 50 for 4 hours.'
WHERE "name" = 'Higher Defense Potion';
