CREATE TABLE "GameProfileSkillTree" (
    "profileId" INTEGER NOT NULL,
    "class" TEXT NOT NULL,
    "ranks" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GameProfileSkillTree_pkey" PRIMARY KEY ("profileId"),
    CONSTRAINT "GameProfileSkillTree_class_check" CHECK ("class" IN ('WARRIOR', 'SCOUT', 'MAGE')),
    CONSTRAINT "GameProfileSkillTree_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Points are level minus purchased ranks: existing profiles immediately receive
-- their full level's allowance, without a repeatable grant or balance backfill.
