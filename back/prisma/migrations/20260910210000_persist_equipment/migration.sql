BEGIN;

DROP INDEX "InventoryItem_gameProfileId_itemId_key";

ALTER TABLE "InventoryItem"
ALTER COLUMN "slot" DROP NOT NULL,
ALTER COLUMN "slot" TYPE TEXT
USING CASE
  WHEN "isEquiped" = FALSE THEN NULL
  WHEN "slot" = 1 THEN 'head'
  WHEN "slot" = 2 THEN 'body'
  WHEN "slot" = 3 THEN 'left-hand'
  WHEN "slot" = 4 THEN 'right-hand'
  WHEN "slot" = 5 THEN 'hands'
  WHEN "slot" = 6 THEN 'legs'
  WHEN "slot" = 7 THEN 'feet'
  WHEN "slot" = 8 THEN 'accessory'
  WHEN "slot" = 9 THEN 'scroll'
  WHEN "slot" = 10 THEN 'potion'
  ELSE NULL
END;

CREATE INDEX "InventoryItem_gameProfileId_itemId_idx"
ON "InventoryItem"("gameProfileId", "itemId");

CREATE UNIQUE INDEX "InventoryItem_gameProfileId_slot_key"
ON "InventoryItem"("gameProfileId", "slot");

COMMIT;
