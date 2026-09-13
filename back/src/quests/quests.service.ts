import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { townAt } from '../locations/towns';
import { generateTownOffers } from './quest-board';
import { habitatForMonster } from '../monsters/monster-habitats';
import type { Quest } from '../../generated/client';

const renderQuest = (quest: Quest) => ({ ...quest, huntingLocation: habitatForMonster(quest.monsterType) ?? null });

@Injectable()
export class QuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    const profile = await this.prisma.gameProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Game profile not found');
    const quests = await this.prisma.playerQuest.findMany({
      where: { gameProfileId: profile.id },
      include: { quest: true },
      orderBy: { acceptedAt: 'desc' },
    });
    const town = townAt(profile);
    const now = new Date();
    if (town) {
      await this.prisma.quest.createMany({ data: generateTownOffers(town, now), skipDuplicates: true });
    }
    const available = town
      ? await this.prisma.quest.findMany({
          where: {
            townId: town.shopId,
            expiresAt: { gt: now },
            players: { none: { gameProfileId: profile.id, canceledAt: null } },
          },
          orderBy: { id: 'asc' },
        })
      : [];
    return {
      town: town ? { id: town.shopId, name: town.name } : null,
      available: available.map(renderQuest),
      active: quests.filter((q) => !q.completedAt && !q.canceledAt).map((q) => ({ ...q, quest: renderQuest(q.quest) })),
      completed: quests.filter((q) => q.completedAt).map((q) => ({ ...q, quest: renderQuest(q.quest) })),
    };
  }

  async accept(userId: number, questId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Share the profile row lock with victory rewards, ordering acceptance and kills.
      const profile = await tx.gameProfile.update({ where: { userId }, data: { gold: { increment: 0 } } });
      const town = townAt(profile);
      if (!town) throw new BadRequestException('Visit a town to accept quests');
      const quest = await tx.quest.findUnique({ where: { id: questId } });
      if (!quest) throw new NotFoundException('Quest not found');
      const key = { gameProfileId_questId: { gameProfileId: profile.id, questId } };
      const existing = await tx.playerQuest.findUnique({ where: key });
      if (existing && !existing.canceledAt) return existing;
      if (quest.townId !== town.shopId || !quest.expiresAt || quest.expiresAt <= new Date()) {
        throw new BadRequestException('This quest is not available on this town board');
      }
      return tx.playerQuest.upsert({
        where: key,
        create: { gameProfileId: profile.id, questId, townId: town.shopId },
        update: { canceledAt: null, progress: 0, acceptedAt: new Date() },
        include: { quest: true },
      });
    });
  }

  async cancel(userId: number, questId: number) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.update({ where: { userId }, data: { gold: { increment: 0 } } });
      const key = { gameProfileId_questId: { gameProfileId: profile.id, questId } };
      const entry = await tx.playerQuest.findUnique({ where: key, include: { quest: true } });
      if (!entry) throw new NotFoundException('Accepted quest not found');
      if (entry.quest.isPrimary) throw new BadRequestException('Primary quests cannot be canceled');
      if (entry.completedAt) throw new BadRequestException('Finished quests cannot be canceled');
      if (entry.canceledAt) return { success: true };
      await tx.playerQuest.update({ where: key, data: { canceledAt: new Date() } });
      return { success: true };
    });
  }
}
