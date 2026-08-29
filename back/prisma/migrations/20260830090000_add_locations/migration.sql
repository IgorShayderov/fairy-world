-- Create location enums
CREATE TYPE "LocationVariant" AS ENUM ('CITY', 'DUNGEON', 'FOREST', 'VILLAGE', 'SHOP');
CREATE TYPE "EventType" AS ENUM ('NONE', 'BATTLE', 'TRADE', 'QUEST', 'REST');

-- Create Location table
CREATE TABLE "Location" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "variant" "LocationVariant" NOT NULL DEFAULT 'CITY',
  "eventType" "EventType" NOT NULL DEFAULT 'NONE'
);

-- Create UsersLocation table (1 user -> 1 location, many users per location)
CREATE TABLE "UsersLocation" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE,
  "locationId" INTEGER NOT NULL,

  CONSTRAINT "UsersLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "UsersLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE
);

CREATE INDEX "UsersLocation_locationId_idx" ON "UsersLocation" ("locationId");
