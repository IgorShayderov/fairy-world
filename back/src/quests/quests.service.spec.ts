import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuestsService } from './quests.service';

describe('QuestsService', () => {
  const profile = { id: 5, mapPositionX: 1470, mapPositionY: 1040 };
  const quest = { id: 1, code: 'wolf_hunt', target: 20, rewardGold: 200, monsterType: 'Dire Wolf' };
  const prisma = {
    $transaction: jest.fn(),
    gameProfile: { findUnique: jest.fn(), update: jest.fn() },
    quest: { findMany: jest.fn(), findUnique: jest.fn() },
    playerQuest: { findMany: jest.fn(), upsert: jest.fn() },
  };
  const service = new QuestsService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.gameProfile.findUnique.mockResolvedValue(profile);
    prisma.gameProfile.update.mockResolvedValue(profile);
    prisma.quest.findUnique.mockResolvedValue(quest);
    prisma.quest.findMany.mockResolvedValue([quest]);
    prisma.playerQuest.findMany.mockResolvedValue([]);
  });
  it('offers quests in towns and separates current from completed entries', async () => {
    const active = { questId: 1, completedAt: null };
    const completed = { questId: 2, completedAt: new Date() };
    prisma.playerQuest.findMany.mockResolvedValue([active, completed]);
    expect(await service.list(7)).toEqual({
      town: { id: 1, name: 'EVERCROSS' },
      available: [quest],
      active: [active],
      completed: [completed],
    });
    expect(prisma.quest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { players: { none: { gameProfileId: 5 } } } }),
    );
  });
  it('hides offers outside towns, without hiding the journal', async () => {
    prisma.gameProfile.findUnique.mockResolvedValue({ ...profile, mapPositionX: 0, mapPositionY: 0 });
    expect((await service.list(7)).available).toEqual([]);
    expect(prisma.quest.findMany).not.toHaveBeenCalled();
  });
  it('rejects acceptance outside towns', async () => {
    prisma.gameProfile.update.mockResolvedValue({ ...profile, mapPositionX: 0, mapPositionY: 0 });
    await expect(service.accept(7, 1)).rejects.toThrow(BadRequestException);
    expect(prisma.playerQuest.upsert).not.toHaveBeenCalled();
  });
  it('rejects unknown quests', async () => {
    prisma.quest.findUnique.mockResolvedValue(null);
    await expect(service.accept(7, 100)).rejects.toThrow(NotFoundException);
  });
  it('accepts once without resetting progress on repeated acceptance', async () => {
    await service.accept(7, 1);
    expect(prisma.playerQuest.upsert).toHaveBeenCalledWith({
      where: { gameProfileId_questId: { gameProfileId: 5, questId: 1 } },
      create: { gameProfileId: 5, questId: 1, townId: 1 },
      update: {},
      include: { quest: true },
    });
  });
});
