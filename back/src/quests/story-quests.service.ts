import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { STORY_QUESTS, storyRewards } from './story-catalog';
import { storyStepUpdate } from './story-progress';
import { townAt, TOWNS } from '../locations/towns';
import { progressionAfterExperience } from '../users/level-progression';
import { accrue, storageCapacity } from '../castles/castle-rules';

@Injectable()
export class StoryQuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    const profile = await this.prisma.gameProfile.findUnique({
      where: { userId },
      include: { storyQuests: true, castle: { select: { id: true } } },
    });
    if (!profile) throw new NotFoundException('Game profile not found');
    return STORY_QUESTS.map((story) => {
      const progress = profile.storyQuests.find((entry) => entry.code === story.code) ?? null;
      return {
        ...story,
        town: TOWNS.find((town) => town.shopId === story.townId),
        progress,
        rewards: storyRewards(progress?.rewardLevel ?? profile.level),
        canChooseResources: !!profile.castle,
      };
    });
  }

  async act(userId: number, code: string, action: 'accept' | 'investigate' | 'claim', choice?: string) {
    const story = STORY_QUESTS.find((story) => story.code === code);
    if (!story) throw new NotFoundException('Story quest not found');
    return this.prisma.$transaction(async (tx) => {
      // The same lock is used by battle rewards and castle resource mutations.
      const profile = await tx.gameProfile.update({ where: { userId }, data: { gold: { increment: 0 } } });
      const key = { gameProfileId_code: { gameProfileId: profile.id, code } };
      const entry = await tx.storyQuestProgress.findUnique({ where: key });
      if (action === 'accept') {
        if (entry) return { success: true };
        if (profile.level < story.minLevel)
          throw new BadRequestException(`Reach level ${story.minLevel} to start this story`);
        if (townAt(profile)?.shopId !== story.townId)
          throw new BadRequestException('Visit the starting town to accept this story');
        await tx.storyQuestProgress.create({ data: { gameProfileId: profile.id, code, rewardLevel: profile.level } });
        return { success: true };
      }
      if (!entry) throw new BadRequestException('Accept this story first');
      if (action === 'investigate') {
        const step = story.steps[entry.step];
        if (entry.completedAt || !step || step.kind !== 'VISIT')
          throw new BadRequestException('There is no location to investigate at this step');
        if (Math.hypot(profile.mapPositionX - step.x, profile.mapPositionY - step.y) > step.radius)
          throw new BadRequestException('Travel to the marked objective before investigating');
        await tx.storyQuestProgress.update({ where: key, data: storyStepUpdate(entry, new Date()) });
        return { success: true };
      }
      if (choice !== 'gold' && choice !== 'resources') throw new BadRequestException('Choose gold or castle resources');
      if (!entry.completedAt) throw new BadRequestException('Complete all story steps before claiming rewards');
      if (entry.claimedAt) return { success: true };
      const rewards = storyRewards(entry.rewardLevel);
      if (choice === 'resources') {
        const castle = await tx.castle.findUnique({ where: { profileId: profile.id } });
        if (!castle) throw new BadRequestException('Build a castle to receive wood and stone, or choose gold');
        const current = { ...castle };
        accrue(current, new Date());
        const capacity = storageCapacity(current);
        if (current.wood + rewards.wood > capacity || current.stone + rewards.stone > capacity)
          throw new BadRequestException(
            'Not enough castle storage. Spend resources or choose gold; your reward remains available',
          );
        await tx.castle.update({
          where: { id: castle.id },
          data: { wood: { increment: rewards.wood }, stone: { increment: rewards.stone } },
        });
      }
      if (entry.bonusEarned) {
        if ((await tx.equipmentGem.count({ where: { gameProfileId: profile.id } })) >= 100)
          throw new BadRequestException('Gem storage is full. Use a gem before claiming this reward');
        await tx.equipmentGem.create({
          data: { gameProfileId: profile.id, type: 'DAMAGE', value: rewards.gemValue, mineLevel: 1 },
        });
      }
      const progression = progressionAfterExperience(profile.level, profile.experience + rewards.experience);
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: {
          gold: { increment: choice === 'gold' ? rewards.gold : 0 },
          experience: progression.experience,
          level: progression.level,
          freeAttributes: { increment: progression.freeAttributes },
        },
      });
      await tx.storyQuestProgress.update({ where: key, data: { claimedAt: new Date(), rewardChoice: choice } });
      return { success: true };
    });
  }
}
