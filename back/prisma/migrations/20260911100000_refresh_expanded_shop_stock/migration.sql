-- Regenerate existing shops on their next visit using the expanded stock rules.
UPDATE "Shop" SET "nextRestockAt" = NULL;
