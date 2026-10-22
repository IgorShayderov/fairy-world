CREATE TABLE "GemActionPrice" (
  "key" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GemActionPrice_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "GemActionPrice_cost_check" CHECK ("cost" BETWEEN 0 AND 100000),
  CONSTRAINT "GemActionPrice_key_check" CHECK ("key" IN ('SHOP_REFRESH', 'QUEST_REFRESH', 'PVP_REFRESH', 'PVP_COOLDOWN', 'DUNGEON_COOLDOWN'))
);
