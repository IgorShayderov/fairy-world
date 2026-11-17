CREATE TABLE "StoryQuestProgress" (
  "gameProfileId" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 0,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "rewardLevel" INTEGER NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stepStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "rewardChoice" TEXT,
  "bonusEarned" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "StoryQuestProgress_pkey" PRIMARY KEY ("gameProfileId", "code"),
  CONSTRAINT "StoryQuestProgress_profile_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
