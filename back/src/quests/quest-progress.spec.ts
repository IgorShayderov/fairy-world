import type { Prisma } from '../../generated/client';
import { recordQuestVictory } from './quest-progress';

describe('quest victory progress', () => {
  const startedAt = new Date('2026-09-13T12:00:00Z');
  const setup = (progress: number, changed = 1) => {
    const tx = {
      playerQuest: {
        findMany: jest.fn().mockResolvedValue([{ questId: 1, progress, quest: { target: 20, rewardGold: 200 } }]),
        updateMany: jest.fn().mockResolvedValue({ count: changed }),
      },
      gameProfile: { update: jest.fn() },
    };
    return { tx, client: tx as unknown as Prisma.TransactionClient };
  };

  it('only counts matching, unfinished quests accepted before this battle', async () => {
    const { tx, client } = setup(3);
    await recordQuestVictory(client, 5, 'Dire Wolf', startedAt);
    expect(tx.playerQuest.findMany).toHaveBeenCalledWith({
      where: {
        gameProfileId: 5,
        completedAt: null,
        acceptedAt: { lte: startedAt },
        quest: { monsterType: { in: ['Dire Wolf', '*'] } },
      },
      include: { quest: true },
    });
    expect(tx.playerQuest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { progress: 4, completedAt: null } }),
    );
    expect(tx.gameProfile.update).not.toHaveBeenCalled();
  });

  it('finishes at the target and grants gold in the same transaction', async () => {
    const { tx, client } = setup(19);
    await recordQuestVictory(client, 5, 'Dire Wolf', startedAt);
    expect(tx.playerQuest.updateMany).toHaveBeenCalledWith({
      where: { gameProfileId: 5, questId: 1, progress: 19, completedAt: null },
      data: { progress: 20, completedAt: expect.any(Date) as Date },
    });
    expect(tx.gameProfile.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { gold: { increment: 200 } } });
  });

  it('does not pay a reward when another update already completed the quest', async () => {
    const { tx, client } = setup(19, 0);
    await recordQuestVictory(client, 5, 'Dire Wolf', startedAt);
    expect(tx.gameProfile.update).not.toHaveBeenCalled();
  });

  it('does not change anything without matching accepted quests', async () => {
    const { tx, client } = setup(0);
    tx.playerQuest.findMany.mockResolvedValue([]);
    await recordQuestVictory(client, 5, 'Goblin Raider', startedAt);
    expect(tx.playerQuest.updateMany).not.toHaveBeenCalled();
    expect(tx.gameProfile.update).not.toHaveBeenCalled();
  });
});
