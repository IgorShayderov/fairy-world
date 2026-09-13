import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuestsService } from './quests.service';
import { habitatForMonster } from '../monsters/monster-habitats';

describe('QuestsService', () => {
  const profile = { id: 5, mapPositionX: 1470, mapPositionY: 1040 };
  const quest = {
    id: 1,
    code: 'hunt',
    target: 20,
    rewardGold: 200,
    monsterType: 'Dire Wolf',
    townId: 1,
    expiresAt: new Date('2099-01-01'),
    isPrimary: false,
  };
  const prisma = {
    $transaction: jest.fn(),
    gameProfile: { findUnique: jest.fn(), update: jest.fn() },
    quest: { findMany: jest.fn(), findUnique: jest.fn(), createMany: jest.fn() },
    playerQuest: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
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
    const active = { questId: 1, completedAt: null, quest };
    const completed = { questId: 2, completedAt: new Date(), quest };
    const rendered = { ...quest, huntingLocation: habitatForMonster(quest.monsterType) };
    prisma.playerQuest.findMany.mockResolvedValue([active, completed]);
    expect(await service.list(7)).toEqual({
      town: { id: 1, name: 'EVERCROSS' },
      available: [rendered],
      active: [{ ...active, quest: rendered }],
      completed: [{ ...completed, quest: rendered }],
    });
    expect(prisma.quest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          townId: 1,
          expiresAt: { gt: expect.any(Date) as Date },
          players: { none: { gameProfileId: 5, canceledAt: null } },
        },
      }),
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
      update: { canceledAt: null, progress: 0, acceptedAt: expect.any(Date) as Date },
      include: { quest: true },
    });
    prisma.playerQuest.findUnique.mockResolvedValue({ progress: 4, canceledAt: null });
    prisma.playerQuest.upsert.mockClear();
    await service.accept(7, 1);
    expect(prisma.playerQuest.upsert).not.toHaveBeenCalled();
  });

  it('rejects offers from other towns or expired boards', async () => {
    prisma.quest.findUnique.mockResolvedValue({ ...quest, townId: 2 });
    await expect(service.accept(7, 1)).rejects.toThrow('not available');
    prisma.quest.findUnique.mockResolvedValue({ ...quest, expiresAt: new Date(0) });
    await expect(service.accept(7, 1)).rejects.toThrow('not available');
  });

  it('allows canceling optional quests outside town and scopes it to the player', async () => {
    prisma.gameProfile.update.mockResolvedValue({ ...profile, mapPositionX: 0, mapPositionY: 0 });
    prisma.playerQuest.findUnique.mockResolvedValue({ quest, completedAt: null, canceledAt: null });
    await expect(service.cancel(7, 1)).resolves.toEqual({ success: true });
    expect(prisma.playerQuest.update).toHaveBeenCalledWith({
      where: { gameProfileId_questId: { gameProfileId: 5, questId: 1 } },
      data: { canceledAt: expect.any(Date) as Date },
    });
  });

  it('does not cancel primary, finished, or unowned quests', async () => {
    prisma.playerQuest.findUnique.mockResolvedValue(null);
    await expect(service.cancel(7, 1)).rejects.toThrow(NotFoundException);
    prisma.playerQuest.findUnique.mockResolvedValue({ quest: { ...quest, isPrimary: true } });
    await expect(service.cancel(7, 1)).rejects.toThrow('Primary quests');
    prisma.playerQuest.findUnique.mockResolvedValue({ quest, completedAt: new Date() });
    await expect(service.cancel(7, 1)).rejects.toThrow('Finished quests');
    expect(prisma.playerQuest.update).not.toHaveBeenCalled();
  });

  it('cancels idempotently and resets progress when reaccepting a canceled offer', async () => {
    prisma.playerQuest.findUnique.mockResolvedValue({ quest, canceledAt: new Date(), progress: 10 });
    await service.cancel(7, 1);
    expect(prisma.playerQuest.update).not.toHaveBeenCalled();
    await service.accept(7, 1);
    expect(prisma.playerQuest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { canceledAt: null, progress: 0, acceptedAt: expect.any(Date) as Date },
      }),
    );
  });
});
