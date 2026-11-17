import type { Prisma, StoryQuestProgress } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { StoryQuestsService } from './story-quests.service';
import { recordStoryVictory, storyStepUpdate } from './story-progress';

const entry = (step = 0): StoryQuestProgress => ({
  gameProfileId: 5,
  code: 'silent-quarry',
  step,
  progress: 0,
  rewardLevel: 5,
  acceptedAt: new Date('2026-01-01'),
  stepStartedAt: new Date('2026-01-01'),
  completedAt: null,
  claimedAt: null,
  rewardChoice: null,
  bonusEarned: false,
});

describe('story objectives', () => {
  it('advances only one step and grants the optional bonus only for the final no-potion victory', () => {
    const now = new Date();
    expect(storyStepUpdate(entry(1), now, true)).toMatchObject({ step: 1, progress: 1, bonusEarned: false });
    expect(storyStepUpdate(entry(2), now, false)).toMatchObject({
      step: 3,
      progress: 0,
      completedAt: now,
      bonusEarned: false,
    });
    expect(storyStepUpdate(entry(2), now, true)).toMatchObject({ step: 3, completedAt: now, bonusEarned: true });
  });
  it('filters pre-acceptance battles and ignores monsters from a future step', async () => {
    const tx = { storyQuestProgress: { findMany: jest.fn().mockResolvedValue([entry(1)]), update: jest.fn() } };
    const startedAt = new Date();
    await recordStoryVictory(tx as unknown as Prisma.TransactionClient, 5, 'Stone Golem', startedAt, true);
    expect(tx.storyQuestProgress.findMany).toHaveBeenCalledWith({
      where: { gameProfileId: 5, completedAt: null, stepStartedAt: { lte: startedAt } },
    });
    expect(tx.storyQuestProgress.update).not.toHaveBeenCalled();
    await recordStoryVictory(tx as unknown as Prisma.TransactionClient, 5, 'Goblin Raider', startedAt, true);
    expect(tx.storyQuestProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ progress: 1, step: 1 }) as unknown }),
    );
  });
});

describe('story quest actions', () => {
  const profile = { id: 5, userId: 9, level: 5, experience: 0, mapPositionX: 1470, mapPositionY: 960 };
  const tx = {
    gameProfile: { update: jest.fn() },
    storyQuestProgress: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    castle: { findUnique: jest.fn(), update: jest.fn() },
    equipmentGem: { count: jest.fn(), create: jest.fn() },
  };
  const prisma = { $transaction: (fn: (value: typeof tx) => unknown) => fn(tx) };
  const service = new StoryQuestsService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    tx.gameProfile.update.mockResolvedValue(profile);
    tx.equipmentGem.count.mockResolvedValue(0);
  });
  it('requires the starting town and minimum level', async () => {
    tx.gameProfile.update.mockResolvedValueOnce({ ...profile, level: 4 });
    await expect(service.act(9, 'silent-quarry', 'accept')).rejects.toThrow('Reach level 5');
    tx.gameProfile.update.mockResolvedValueOnce({ ...profile, mapPositionX: 0 });
    await expect(service.act(9, 'silent-quarry', 'accept')).rejects.toThrow('starting town');
    expect(tx.storyQuestProgress.create).not.toHaveBeenCalled();
    await service.act(9, 'silent-quarry', 'accept');
    expect(tx.storyQuestProgress.create).toHaveBeenCalledWith({
      data: { gameProfileId: 5, code: 'silent-quarry', rewardLevel: 5 },
    });
  });
  it('checks location on the server and cannot skip a hunting step', async () => {
    tx.storyQuestProgress.findUnique.mockResolvedValue(entry());
    await expect(service.act(9, 'silent-quarry', 'investigate')).rejects.toThrow('Travel to');
    tx.gameProfile.update.mockResolvedValue({ ...profile, mapPositionX: 1400, mapPositionY: 1170 });
    await service.act(9, 'silent-quarry', 'investigate');
    expect(tx.storyQuestProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ step: 1 }) as unknown }),
    );
    tx.storyQuestProgress.findUnique.mockResolvedValue(entry(1));
    await expect(service.act(9, 'silent-quarry', 'investigate')).rejects.toThrow('no location');
  });
  it('rejects incomplete claims and invalid reward choices', async () => {
    tx.storyQuestProgress.findUnique.mockResolvedValue(entry());
    await expect(service.act(9, 'silent-quarry', 'claim', 'gems')).rejects.toThrow('Choose gold');
    await expect(service.act(9, 'silent-quarry', 'claim', 'gold')).rejects.toThrow('Complete all');
  });
  it('pays rewards once, including the earned gem', async () => {
    tx.storyQuestProgress.findUnique.mockResolvedValue({ ...entry(3), completedAt: new Date(), bonusEarned: true });
    await service.act(9, 'silent-quarry', 'claim', 'gold');
    expect(tx.gameProfile.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gold: { increment: 750 } }) as unknown }),
    );
    expect(tx.equipmentGem.create).toHaveBeenCalledWith({
      data: { gameProfileId: 5, type: 'DAMAGE', value: 4, mineLevel: 1 },
    });
    tx.storyQuestProgress.findUnique.mockResolvedValue({ ...entry(3), completedAt: new Date(), claimedAt: new Date() });
    await service.act(9, 'silent-quarry', 'claim', 'gold');
    expect(tx.equipmentGem.create).toHaveBeenCalledTimes(1);
    expect(tx.storyQuestProgress.update).toHaveBeenCalledTimes(1);
  });
  it('keeps resource rewards unclaimed without a castle or enough capacity', async () => {
    tx.storyQuestProgress.findUnique.mockResolvedValue({ ...entry(3), completedAt: new Date() });
    await expect(service.act(9, 'silent-quarry', 'claim', 'resources')).rejects.toThrow('Build a castle');
    tx.castle.findUnique.mockResolvedValue({
      id: 'castle',
      keep: 1,
      storehouse: 0,
      wood: 999,
      stone: 999,
      lumberMill: 1,
      quarry: 1,
      producedAt: new Date(),
    });
    await expect(service.act(9, 'silent-quarry', 'claim', 'resources')).rejects.toThrow('Not enough castle storage');
    expect(tx.storyQuestProgress.update).not.toHaveBeenCalled();
  });
});
