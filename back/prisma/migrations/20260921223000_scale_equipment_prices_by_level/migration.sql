UPDATE "Item"
SET "price" = ROUND(
  "price" * (1 + 0.26 * GREATEST("level", 1)) / (1 + 0.10 * GREATEST("level", 1))
)::INTEGER
WHERE "isConsumable" = FALSE
  AND "price" > 0;
