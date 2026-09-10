BEGIN;

CREATE TABLE "Shop" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0 CHECK ("gold" >= 0),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopStock" (
    "shopId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" >= 0),
    CONSTRAINT "ShopStock_pkey" PRIMARY KEY ("shopId", "itemId"),
    CONSTRAINT "ShopStock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserve current stock in the original shop before removing global quantities.
INSERT INTO "Shop" ("name", "gold") VALUES ('General Store', 1000);
INSERT INTO "ShopStock" ("shopId", "itemId", "quantity")
SELECT 1, "id", "quantity" FROM "Item";
ALTER TABLE "Item" DROP COLUMN "quantity";

COMMIT;
