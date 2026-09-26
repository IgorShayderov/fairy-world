-- CreateEnum
CREATE TYPE "ClanRole" AS ENUM ('LEADER', 'OFFICER', 'MEMBER');

-- CreateTable
CREATE TABLE "Clan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "activityPoints" INTEGER NOT NULL DEFAULT 0,
    "activeBannerCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Clan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClanMember" (
    "clanId" TEXT NOT NULL,
    "gameProfileId" INTEGER NOT NULL,
    "role" "ClanRole" NOT NULL DEFAULT 'MEMBER',
    "contributedActivity" INTEGER NOT NULL DEFAULT 0,
    "trackedKilledMonsters" INTEGER NOT NULL DEFAULT 0,
    "trackedDungeonsCleared" INTEGER NOT NULL DEFAULT 0,
    "trackedQuestsCompleted" INTEGER NOT NULL DEFAULT 0,
    "trackedPvpVictories" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClanMember_pkey" PRIMARY KEY ("clanId", "gameProfileId")
);

-- CreateTable
CREATE TABLE "ClanBannerUnlock" (
    "clanId" TEXT NOT NULL,
    "bannerCode" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClanBannerUnlock_pkey" PRIMARY KEY ("clanId", "bannerCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clan_name_key" ON "Clan"("name");
CREATE UNIQUE INDEX "Clan_tag_key" ON "Clan"("tag");
CREATE UNIQUE INDEX "ClanMember_gameProfileId_key" ON "ClanMember"("gameProfileId");
CREATE INDEX "ClanMember_clanId_role_idx" ON "ClanMember"("clanId", "role");

-- AddForeignKey
ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanBannerUnlock" ADD CONSTRAINT "ClanBannerUnlock_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
