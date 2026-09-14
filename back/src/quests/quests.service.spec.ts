import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuestsService } from './quests.service';
import { habitatForMonster } from '../monsters/monster-habitats';
import { ItemGeneratorService } from '../items/item-generator.service';

describe('QuestsService', () => {
  const profile = { id: 5, gems: 60, mapPositionX: 1470, mapPositionY: 1040 };
  const board = { id: 'board-1', revision: 0, nextRefreshAt: new Date('2099-01-01') };
  const quest = {
    id: 1,
    boardId: 'board-1',
    boardRevision: 0,
    code: 'hunt',
    target: 20,
    rewardGold: 200,
    monsterType: 'Dire Wolf',
    townId: 1,
    expiresAt: new Date('2099-01-01'),
    isPrimary: false,
  };
  const prisma = {
    inventoryItem: { create: jest.fn() },
    $transaction: jest.fn(),
    questBoard: { findUnique: jest.fn(), upsert: jest.fn() },
    gameProfile: { findUnique: jest.fn(), update: jest.fn() },
    quest: { findMany: jest.fn(), findUnique: jest.fn(), createMany: jest.fn() },
    playerQuest: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), count: jest.fn() },
  };
  const items = { generate: jest.fn() };
  const service = new QuestsService(prisma as unknown as PrismaService, items as unknown as ItemGeneratorService);
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    prisma.questBoard.findUnique.mockResolvedValue(board);
    prisma.questBoard.upsert.mockResolvedValue({ ...board, revision: 1 });
    prisma.playerQuest.count.mockResolvedValue(0);
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
    const rendered = { ...quest, destination: null, huntingLocation: habitatForMonster(quest.monsterType) };
    prisma.playerQuest.findMany.mockResolvedValue([active, completed]);
    expect(await service.list(7)).toEqual({
      town: { id: 1, name: 'EVERCROSS' },
      nextRefreshAt: board.nextRefreshAt,
      refreshCost: 30,
      maxActive: 5,
      available: [rendered],
      active: [{ ...active, quest: rendered }],
      completed: [{ ...completed, quest: rendered }],
    });
    expect(prisma.quest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          townId: 1,
          boardId: board.id,
          boardRevision: board.revision,
          expiresAt: { gt: expect.any(Date) as Date },
          players: { none: { gameProfileId: 5, canceledAt: null } },
        },
      }),
    );
  });

  it('rejects delivery from the wrong town without granting rewards', async () => {
    prisma.playerQuest.findUnique.mockResolvedValue({ quest: { ...quest, destinationTownId: 2 } });
    await expect(service.deliver(7, 1)).rejects.toThrow(BadRequestException);
    expect(prisma.playerQuest.update).not.toHaveBeenCalled();
    expect(items.generate).not.toHaveBeenCalled();
  });

  it('delivers at the destination once, grants XP and gold, and can grant Magic loot', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.95);
    prisma.gameProfile.update.mockResolvedValue({ ...profile, level: 1, experience: 0 });
    prisma.playerQuest.findUnique.mockResolvedValue({
      quest: { ...quest, destinationTownId: 1, rewardGold: 50, rewardExperience: 100 },
    });
    items.generate.mockResolvedValue({ id: 42 });
    await service.deliver(7, 1);
    expect(prisma.playerQuest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { progress: 1, completedAt: expect.any(Date) as Date } }),
    );
    expect(prisma.gameProfile.update).toHaveBeenLastCalledWith({
      where: { id: 5 },
      data: {
        gold: { increment: 50 },
        experience: 0,
        level: 2,
        freeAttributes: { increment: 5 },
      },
    });
    expect(items.generate).toHaveBeenCalledWith({ level: 1, rarity: 'MAGIC', minimumRarity: 'MAGIC' }, prisma);
    expect(prisma.inventoryItem.create).toHaveBeenCalledTimes(1);
    prisma.playerQuest.findUnique.mockResolvedValue({ completedAt: new Date() });
    await service.deliver(7, 1);
    expect(prisma.playerQuest.update).toHaveBeenCalledTimes(1);
    expect(prisma.inventoryItem.create).toHaveBeenCalledTimes(1);
  });

  it('rejects canceled and unaccepted deliveries', async () => {
    prisma.playerQuest.findUnique.mockResolvedValue(null);
    await expect(service.deliver(7, 1)).rejects.toThrow(NotFoundException);
    prisma.playerQuest.findUnique.mockResolvedValue({ canceledAt: new Date() });
    await expect(service.deliver(7, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.playerQuest.update).not.toHaveBeenCalled();
  });
  it('hides offers outside towns, without hiding the journal', async () => {
    prisma.gameProfile.update.mockResolvedValue({ ...profile, mapPositionX: 0, mapPositionY: 0 });
    expect((await service.list(7)).available).toEqual([]);
    expect(prisma.quest.findMany).not.toHaveBeenCalled();
  });
  it('rejects acceptance outside towns', async () => {
    prisma.gameProfile.update.mockResolvedValue({ ...profile, mapPositionX: 0, mapPositionY: 0 });
    await expect(service.accept(7, 1)).rejects.toThrow(BadRequestException);
    expect(prisma.playerQuest.upsert).not.toHaveBeenCalled();
  });

  it('enforces the five-active-quest limit', async () => {
    prisma.playerQuest.count.mockResolvedValue(5);
    await expect(service.accept(7, 1)).rejects.toThrow('at most five');
    expect(prisma.playerQuest.upsert).not.toHaveBeenCalled();
  });

  it('refreshes only this players board and charges exactly 30 gems', async () => {
    await service.refresh(7);
    expect(prisma.gameProfile.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { gems: { decrement: 30 } } });
    expect(prisma.questBoard.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameProfileId_townId: { gameProfileId: 5, townId: 1 } },
        update: { revision: { increment: 1 }, nextRefreshAt: expect.any(Date) as Date },
      }),
    );
    expect(prisma.playerQuest.update).not.toHaveBeenCalled();
  });

  it('does not charge or reroll when gems are insufficient', async () => {
    prisma.gameProfile.update.mockResolvedValue({ ...profile, gems: 29 });
    await expect(service.refresh(7)).rejects.toThrow('Not enough gems');
    expect(prisma.questBoard.upsert).not.toHaveBeenCalled();
    expect(prisma.gameProfile.update).toHaveBeenCalledTimes(1);
  });

  it('automatically renews an expired board without charging gems', async () => {
    prisma.questBoard.findUnique.mockResolvedValue({ ...board, nextRefreshAt: new Date(0) });
    await service.list(7);
    expect(prisma.questBoard.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.quest.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.gameProfile.update).toHaveBeenCalledTimes(1);
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
