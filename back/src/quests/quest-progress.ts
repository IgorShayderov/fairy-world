import type { Prisma } from '../../generated/client';

// Called within the victory transaction after locking/updating the profile.
export async function recordQuestVictory(
  tx: Prisma.TransactionClient,
  gameProfileId: number,
  monsterType: string,
  battleStartedAt: Date,
) {
  const active = await tx.playerQuest.findMany({
    where: {
      gameProfileId,
      completedAt: null,
      acceptedAt: { lte: battleStartedAt },
      quest: { monsterType: { in: [monsterType, '*'] } },
    },
    include: { quest: true },
  });
  for (const entry of active) {
    const progress = Math.min(entry.quest.target, entry.progress + 1);
    const completed = progress === entry.quest.target;
    const updated = await tx.playerQuest.updateMany({
      where: { gameProfileId, questId: entry.questId, progress: entry.progress, completedAt: null },
      data: { progress, completedAt: completed ? new Date() : null },
    });
    if (completed && updated.count === 1) {
      await tx.gameProfile.update({
        where: { id: gameProfileId },
        data: { gold: { increment: entry.quest.rewardGold } },
      });
    }
  }
}
