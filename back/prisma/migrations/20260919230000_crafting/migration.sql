ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'RECIPE';

CREATE TYPE "CraftItemKind" AS ENUM ('MATERIAL', 'UPGRADE');
CREATE TYPE "CraftUpgradeType" AS ENUM ('DAMAGE', 'DEFENSE', 'GOLD', 'EXPERIENCE', 'HEALTH');

ALTER TABLE "InventoryItem"
ADD COLUMN "upgradeType" "CraftUpgradeType",
ADD COLUMN "upgradeValue" DOUBLE PRECISION;

CREATE TABLE "CraftItem" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "icon" TEXT NOT NULL DEFAULT '',
  "rarity" "ItemRarity" NOT NULL DEFAULT 'COMMON',
  "kind" "CraftItemKind" NOT NULL,
  "upgradeType" "CraftUpgradeType",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CraftItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerCraftItem" (
  "gameProfileId" INTEGER NOT NULL,
  "craftItemId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PlayerCraftItem_pkey" PRIMARY KEY ("gameProfileId", "craftItemId")
);

CREATE TABLE "CraftRecipe" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "shopItemId" INTEGER NOT NULL,
  "resultCraftItemId" INTEGER NOT NULL,
  "resultQuantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "CraftRecipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeIngredient" (
  "recipeId" INTEGER NOT NULL,
  "craftItemId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("recipeId", "craftItemId")
);

CREATE TABLE "LearnedCraftRecipe" (
  "gameProfileId" INTEGER NOT NULL,
  "recipeId" INTEGER NOT NULL,
  "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearnedCraftRecipe_pkey" PRIMARY KEY ("gameProfileId", "recipeId")
);

CREATE UNIQUE INDEX "CraftItem_code_key" ON "CraftItem"("code");
CREATE UNIQUE INDEX "CraftRecipe_code_key" ON "CraftRecipe"("code");
CREATE UNIQUE INDEX "CraftRecipe_shopItemId_key" ON "CraftRecipe"("shopItemId");

ALTER TABLE "PlayerCraftItem" ADD CONSTRAINT "PlayerCraftItem_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerCraftItem" ADD CONSTRAINT "PlayerCraftItem_craftItemId_fkey" FOREIGN KEY ("craftItemId") REFERENCES "CraftItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CraftRecipe" ADD CONSTRAINT "CraftRecipe_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CraftRecipe" ADD CONSTRAINT "CraftRecipe_resultCraftItemId_fkey" FOREIGN KEY ("resultCraftItemId") REFERENCES "CraftItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CraftRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_craftItemId_fkey" FOREIGN KEY ("craftItemId") REFERENCES "CraftItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearnedCraftRecipe" ADD CONSTRAINT "LearnedCraftRecipe_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnedCraftRecipe" ADD CONSTRAINT "LearnedCraftRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CraftRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
