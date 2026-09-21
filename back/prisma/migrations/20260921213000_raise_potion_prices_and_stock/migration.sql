UPDATE "Item"
SET "price" = CASE "name"
  WHEN 'Minor Health Potion' THEN 60
  WHEN 'Lesser Health Potion' THEN 150
  WHEN 'Medium Health Potion' THEN 360
  WHEN 'Mild Health Potion' THEN 700
  WHEN 'Greater Health Potion' THEN 1200
  WHEN 'Higher Health Potion' THEN 1800
  WHEN 'Lesser Experience Potion' THEN 100
  WHEN 'Lesser Attack Potion' THEN 80
  WHEN 'Lesser Defense Potion' THEN 80
  WHEN 'Medium Experience Potion' THEN 240
  WHEN 'Medium Attack Potion' THEN 180
  WHEN 'Medium Defense Potion' THEN 180
  WHEN 'Mild Experience Potion' THEN 500
  WHEN 'Mild Attack Potion' THEN 360
  WHEN 'Mild Defense Potion' THEN 360
  WHEN 'Free Attribute Potion' THEN 2000
  WHEN 'Greater Experience Potion' THEN 900
  WHEN 'Greater Attack Potion' THEN 600
  WHEN 'Greater Defense Potion' THEN 600
  WHEN 'Higher Experience Potion' THEN 1600
  WHEN 'Higher Attack Potion' THEN 1000
  WHEN 'Higher Defense Potion' THEN 1000
  ELSE "price"
END
WHERE "name" LIKE '%Potion';

UPDATE "ShopStock" AS stock
SET "quantity" = 5
FROM "Item" AS item
WHERE stock."itemId" = item."id"
  AND item."name" LIKE '%Health Potion'
  AND stock."quantity" < 5;
