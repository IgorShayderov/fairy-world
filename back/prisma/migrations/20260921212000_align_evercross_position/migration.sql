ALTER TABLE "GameProfile"
ALTER COLUMN "mapPositionY" SET DEFAULT 960;

UPDATE "GameProfile"
SET "mapPositionY" = 960
WHERE "mapPositionX" = 1470
  AND "mapPositionY" = 1040;
