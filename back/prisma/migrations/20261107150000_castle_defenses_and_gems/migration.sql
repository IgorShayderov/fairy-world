ALTER TABLE "Castle"
  ADD COLUMN "gates" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "arrowTower1" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "arrowTower2" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mageTower1" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mageTower2" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "gemMine" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "miningEndsAt" TIMESTAMP(3),
  ADD COLUMN "miningLevel" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "InventoryItem"
  ADD COLUMN "hasSocket" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "socketGemType" "CraftUpgradeType",
  ADD COLUMN "socketGemValue" INTEGER,
  ADD CONSTRAINT "InventoryItem_socket_integrity" CHECK (
    ("socketGemType" IS NULL AND "socketGemValue" IS NULL) OR
    ("hasSocket" AND "socketGemType" IS NOT NULL AND "socketGemValue" IS NOT NULL AND "socketGemValue" > 0)
  ),
  ADD CONSTRAINT "InventoryItem_socket_singleton" CHECK (NOT "hasSocket" OR "quantity" = 1);

CREATE TABLE "EquipmentGem" (
  "id" TEXT NOT NULL,
  "gameProfileId" INTEGER NOT NULL,
  "type" "CraftUpgradeType" NOT NULL,
  "value" INTEGER NOT NULL CHECK ("value" > 0),
  "mineLevel" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentGem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentGem_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EquipmentGem_gameProfileId_idx" ON "EquipmentGem"("gameProfileId");
