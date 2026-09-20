-- Give amulets their own equipment slot. Rings remain in the accessory slot.
UPDATE "InventoryItem" AS inventory
SET "slot" = 'amulet'
FROM "Item" AS item
WHERE inventory."itemId" = item."id"
  AND inventory."isEquiped" = TRUE
  AND inventory."slot" = 'accessory'
  AND 'AMULET'::"EquipmentType" = ANY(item."equipmentType");

-- Scrolls and potions are no longer equipment. Return any legacy equipped
-- entries to the regular inventory before reserving the banner position.
UPDATE "InventoryItem"
SET "isEquiped" = FALSE,
    "slot" = NULL
WHERE "isEquiped" = TRUE
  AND "slot" IN ('scroll', 'potion');
