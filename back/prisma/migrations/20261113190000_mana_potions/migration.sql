INSERT INTO "Item" ("name", "description", "price", "icon", "isConsumable", "rarity", "equipmentType", "level")
SELECT grade || ' Mana Potion', 'Restores up to ' || restore::text || ' mana during battle.', price, 'icon_potion.png', true, rarity::"ItemRarity", ARRAY['POTION']::"EquipmentType"[], level
FROM (VALUES
  ('Minor', 50, 60, 'COMMON', 1),
  ('Lesser', 120, 150, 'COMMON', 10),
  ('Medium', 250, 360, 'MAGIC', 20),
  ('Mild', 450, 700, 'MAGIC', 30),
  ('Greater', 700, 1200, 'RARE', 40),
  ('Higher', 1000, 1800, 'RARE', 50)
) AS potions(grade, restore, price, rarity, level)
WHERE NOT EXISTS (SELECT 1 FROM "Item" WHERE "name" = grade || ' Mana Potion');
UPDATE "Shop" SET "nextRestockAt" = NOW();
