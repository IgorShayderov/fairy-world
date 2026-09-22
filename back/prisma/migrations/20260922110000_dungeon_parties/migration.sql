CREATE TABLE "DungeonParty" (
    "id" TEXT NOT NULL,
    "dungeon" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "leaderProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DungeonParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DungeonPartyMember" (
    "partyId" TEXT NOT NULL,
    "gameProfileId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DungeonPartyMember_pkey" PRIMARY KEY ("partyId","gameProfileId")
);

CREATE INDEX "DungeonParty_dungeon_status_idx" ON "DungeonParty"("dungeon", "status");
CREATE UNIQUE INDEX "DungeonPartyMember_gameProfileId_key" ON "DungeonPartyMember"("gameProfileId");

ALTER TABLE "DungeonParty" ADD CONSTRAINT "DungeonParty_leaderProfileId_fkey" FOREIGN KEY ("leaderProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DungeonPartyMember" ADD CONSTRAINT "DungeonPartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "DungeonParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DungeonPartyMember" ADD CONSTRAINT "DungeonPartyMember_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
