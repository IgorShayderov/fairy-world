import type { Prisma, StoryQuestProgress } from '../../generated/client';
import { STORY_QUESTS } from './story-catalog';

export function storyStepUpdate(entry: StoryQuestProgress, now: Date, noPotion = false) {
  const story = STORY_QUESTS.find((story) => story.code === entry.code)!;
  const step = story.steps[entry.step];
  const progress = entry.progress + 1;
  const done = progress >= step.target;
  return {
    progress: done ? 0 : progress,
    step: done ? entry.step + 1 : entry.step,
    stepStartedAt: done ? now : entry.stepStartedAt,
    completedAt: done && entry.step + 1 === story.steps.length ? now : null,
    // For multi-kill objectives, the bonus is earned by the final fight.
    bonusEarned: entry.bonusEarned || Boolean(done && step.optionalNoPotion && noPotion),
  };
}

// Called in the same transaction and profile lock as world-battle rewards.
export async function recordStoryVictory(
  tx: Prisma.TransactionClient,
  profileId: number,
  monsterType: string,
  startedAt: Date,
  noPotion: boolean,
) {
  const entries = await tx.storyQuestProgress.findMany({
    where: { gameProfileId: profileId, completedAt: null, stepStartedAt: { lte: startedAt } },
  });
  for (const entry of entries) {
    const step = STORY_QUESTS.find((story) => story.code === entry.code)?.steps[entry.step];
    if (!step || step.kind !== 'HUNT' || step.monsterType !== monsterType) continue;
    await tx.storyQuestProgress.update({
      where: { gameProfileId_code: { gameProfileId: profileId, code: entry.code } },
      data: storyStepUpdate(entry, new Date(), noPotion),
    });
  }
}
