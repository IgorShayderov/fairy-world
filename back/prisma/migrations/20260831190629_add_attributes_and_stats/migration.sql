-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('STRENGTH', 'AGILITY', 'ENDURANCE', 'WISDOM', 'CHARISMA');

-- CreateEnum
CREATE TYPE "StatType" AS ENUM ('HEALTH', 'MANA', 'DAMAGE', 'DEFENSE', 'CRIT', 'DODGE', 'CRIT_DAMAGE');

-- CreateTable
CREATE TABLE "Attribute" (
    "id" SERIAL NOT NULL,
    "name" "AttributeType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stat" (
    "id" SERIAL NOT NULL,
    "name" "StatType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileAttribute" (
    "gameProfileId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProfileAttribute_pkey" PRIMARY KEY ("gameProfileId","attributeId")
);

-- CreateTable
CREATE TABLE "ProfileStat" (
    "gameProfileId" INTEGER NOT NULL,
    "statId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProfileStat_pkey" PRIMARY KEY ("gameProfileId","statId")
);

-- CreateTable
CREATE TABLE "ItemAttribute" (
    "itemId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItemAttribute_pkey" PRIMARY KEY ("itemId","attributeId")
);

-- CreateTable
CREATE TABLE "ItemStat" (
    "itemId" INTEGER NOT NULL,
    "statId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ItemStat_pkey" PRIMARY KEY ("itemId","statId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_name_key" ON "Attribute"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Stat_name_key" ON "Stat"("name");

-- AddForeignKey
ALTER TABLE "ProfileAttribute" ADD CONSTRAINT "ProfileAttribute_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAttribute" ADD CONSTRAINT "ProfileAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileStat" ADD CONSTRAINT "ProfileStat_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileStat" ADD CONSTRAINT "ProfileStat_statId_fkey" FOREIGN KEY ("statId") REFERENCES "Stat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAttribute" ADD CONSTRAINT "ItemAttribute_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAttribute" ADD CONSTRAINT "ItemAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemStat" ADD CONSTRAINT "ItemStat_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemStat" ADD CONSTRAINT "ItemStat_statId_fkey" FOREIGN KEY ("statId") REFERENCES "Stat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
