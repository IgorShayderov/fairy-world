-- Defense catalysts now grant twice their previous rating at every level tier.
-- Existing items retain their original crafting tier while receiving the new value.
UPDATE "InventoryItem"
SET "upgradeValue" = "upgradeValue" * 2
WHERE "upgradeType" = 'DEFENSE'
  AND "upgradeValue" IS NOT NULL;
