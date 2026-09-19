import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TOWNS, townAt } from '../locations/towns';
import { generateTownOffers } from './quest-board';
import { habitatForMonster } from '../monsters/monster-habitats';
import type { Quest, Prisma } from '../../generated/client';
import { progressionAfterExperience } from '../users/level-progression';

const renderQuest = (quest: Quest) => ({
  ...quest,
  destination: TOWNS.find((town) => town.shopId === quest.destinationTownId) ?? null,
  huntingLocation: habitatForMonster(quest.monsterType) ?? null,
});

@Injectable()
export class QuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async deliver(userId: number, questId: number) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.update({ where: { userId }, data: { gold: { increment: 0 } } });
      const key = { gameProfileId_questId: { gameProfileId: profile.id, questId } };
      const entry = await tx.playerQuest.findUnique({ where: key, include: { quest: true } });
      if (!entry || entry.canceledAt) throw new NotFoundException('Active quest not found');
      if (entry.completedAt) return { success: true };
      const town = townAt(profile);
      if (!town || entry.quest.destinationTownId !== town.shopId)
        throw new BadRequestException('Visit the destination town to deliver this message');
      await tx.playerQuest.update({ where: key, data: { progress: 1, completedAt: new Date() } });
      const progression = progressionAfterExperience(profile.level, profile.experience + entry.quest.rewardExperience);
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: {
          gold: { increment: entry.quest.rewardGold },
          experience: progression.experience,
          level: progression.level,
          freeAttributes: { increment: progression.freeAttributes },
        },
      });
      return { success: true };
    });
  }

  async list(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.update({ where: { userId }, data: { gold: { increment: 0 } } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const quests = await tx.playerQuest.findMany({
        where: { gameProfileId: profile.id },
        include: { quest: true },
        orderBy: { acceptedAt: 'desc' },
      });
      const town = townAt(profile);
      const now = new Date();
      const board = town ? await this.ensureBoard(tx, profile.id, town, false, profile.level) : null;
      const available = town
        ? await tx.quest.findMany({
            where: {
              townId: town.shopId,
              boardId: board!.id,
              boardRevision: board!.revision,
              expiresAt: { gt: now },
              players: { none: { gameProfileId: profile.id, canceledAt: null } },
            },
            orderBy: { id: 'asc' },
          })
        : [];
      return {
        town: town ? { id: town.shopId, name: town.name } : null,
        nextRefreshAt: board?.nextRefreshAt ?? null,
        refreshCost: 30,
        maxActive: 5,
        available: available.map(renderQuest),
        active: quests
          .filter((q) => !q.completedAt && !q.canceledAt)
          .map((q) => ({ ...q, quest: renderQuest(q.quest) })),
        completed: quests.filter((q) => q.completedAt).map((q) => ({ ...q, quest: renderQuest(q.quest) })),
      };
    });
  }

  private async ensureBoard(
    tx: Prisma.TransactionClient,
    profileId: number,
    town: NonNullable<ReturnType<typeof townAt>>,
    force = false,
    playerLevel = 1,
  ) {
    const key = { gameProfileId_townId: { gameProfileId: profileId, townId: town.shopId } };
    const now = new Date();
    let board = await tx.questBoard.findUnique({ where: key });
    let levelMismatch = false;
    if (board && !force && board.nextRefreshAt > now) {
      const sampleQuest = await tx.quest.findFirst({
        where: { boardId: board.id, boardRevision: board.revision },
        select: { code: true, destinationTownId: true, rewardGold: true, target: true },
      });
      if (sampleQuest) {
        const match = sampleQuest.code.match(/_lvl(\d+)_/);
        const questLevel = match
          ? Number(match[1])
          : sampleQuest.destinationTownId
            ? Math.round(sampleQuest.rewardGold / 50)
            : Math.round(sampleQuest.rewardGold / (sampleQuest.target * 10));
        if (questLevel !== Math.max(1, playerLevel)) {
          levelMismatch = true;
        }
      }
    }
    if (board && !force && !levelMismatch && board.nextRefreshAt > now) return board;
    const nextRefreshAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    board = await tx.questBoard.upsert({
      where: key,
      create: { gameProfileId: profileId, townId: town.shopId, nextRefreshAt },
      update: { revision: { increment: 1 }, nextRefreshAt },
    });
    await tx.quest.createMany({
      data: generateTownOffers(town, now, `${board.id}_${board.revision}_lvl${playerLevel}`, playerLevel).map(
        (quest) => ({
          ...quest,
          boardId: board.id,
          boardRevision: board.revision,
          expiresAt: nextRefreshAt,
        }),
      ),
    });
    return board;
  }

  async refresh(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.update({ where: { userId }, data: { gold: { increment: 0 } } });
      const town = townAt(profile);
      if (!town) throw new BadRequestException('Visit a town to refresh quests');
      if (profile.gems < 30) throw new BadRequestException('Not enough gems');
      await tx.gameProfile.update({ where: { id: profile.id }, data: { gems: { decrement: 30 } } });
      const board = await this.ensureBoard(tx, profile.id, town, true, profile.level);
      return { nextRefreshAt: board.nextRefreshAt, cost: 30 };
    });
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
      const activeCount = await tx.playerQuest.count({
        where: { gameProfileId: profile.id, completedAt: null, canceledAt: null },
      });
      if (activeCount >= 5) throw new BadRequestException('You can have at most five active quests');
      const board = await this.ensureBoard(tx, profile.id, town, false, profile.level);
      if (
        quest.townId !== town.shopId ||
        quest.boardId !== board.id ||
        quest.boardRevision !== board.revision ||
        !quest.expiresAt ||
        quest.expiresAt <= new Date()
      ) {
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
