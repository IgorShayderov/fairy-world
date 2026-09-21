CREATE TABLE "DungeonRun" (
    "id" TEXT NOT NULL,
    "gameProfileId" INTEGER NOT NULL,
    "dungeon" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DungeonRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DungeonRun_gameProfileId_key" ON "DungeonRun"("gameProfileId");

ALTER TABLE "DungeonRun"
ADD CONSTRAINT "DungeonRun_gameProfileId_fkey"
FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
