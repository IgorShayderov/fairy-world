-- Add equipped flag to InventoryItem join table
ALTER TABLE "InventoryItem" ADD COLUMN "equipped" BOOLEAN NOT NULL DEFAULT false;
