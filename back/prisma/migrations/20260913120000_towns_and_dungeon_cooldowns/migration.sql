CREATE TABLE "DungeonVisit" (
  "gameProfileId" INTEGER NOT NULL,
  "dungeon" TEXT NOT NULL,
  "nextEntryAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DungeonVisit_pkey" PRIMARY KEY ("gameProfileId", "dungeon"),
  CONSTRAINT "DungeonVisit_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "Shop" ("id", "name", "gold", "updatedAt") VALUES
 (1, 'Evercross Market', 10000, NOW()), (2, 'Aurelia Market', 10000, NOW()),
 (3, 'Moonfall Market', 10000, NOW()), (4, 'Mosskeep Market', 10000, NOW()),
 (5, 'Westmere Market', 10000, NOW()), (6, 'Frostwatch Market', 10000, NOW()),
 (7, 'Larkhaven Market', 10000, NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
SELECT setval(pg_get_serial_sequence('"Shop"', 'id'), (SELECT MAX("id") FROM "Shop"));
