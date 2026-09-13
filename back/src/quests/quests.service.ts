import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { townAt } from '../locations/towns';

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
    const available = town
      ? await this.prisma.quest.findMany({
          where: { players: { none: { gameProfileId: profile.id } } },
          orderBy: { id: 'asc' },
        })
      : [];
    return {
      town: town ? { id: town.shopId, name: town.name } : null,
      available,
      active: quests.filter((q) => !q.completedAt),
      completed: quests.filter((q) => q.completedAt),
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
      return tx.playerQuest.upsert({
        where: { gameProfileId_questId: { gameProfileId: profile.id, questId } },
        create: { gameProfileId: profile.id, questId, townId: town.shopId },
        update: {},
        include: { quest: true },
      });
    });
  }
}
