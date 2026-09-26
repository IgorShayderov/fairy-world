import { ForbiddenException } from '@nestjs/common';
import { ClanRole } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { CLAN_ACTIVITY_REWARDS, CLAN_MIN_LEVEL, ClansService } from './clans.service';

describe('ClansService', () => {
  const gameProfileFindUnique = jest.fn();
  const clanFindFirst = jest.fn();
  const clanCreate = jest.fn();
  const clanFindUnique = jest.fn();
  const clanMemberFindMany = jest.fn();
  const clanMemberUpdate = jest.fn();
  const clanUpdate = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    gameProfile: { findUnique: gameProfileFindUnique },
    clan: { findFirst: clanFindFirst, create: clanCreate, findUnique: clanFindUnique, update: clanUpdate },
    clanMember: { findMany: clanMemberFindMany, update: clanMemberUpdate },
    $transaction: transaction,
  } as unknown as PrismaService;
  let service: ClansService;

  const profile = {
    id: 7,
    userId: 4,
    level: 10,
    killedMonsters: 12,
    dungeonsCleared: 2,
    coinsOfHonour: 3,
    clanMembership: null,
    _count: { quests: 5 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClansService(prisma);
    gameProfileFindUnique.mockResolvedValue(profile);
    clanFindFirst.mockResolvedValue(null);
    clanCreate.mockResolvedValue({ id: 'clan-1' });
    clanFindUnique.mockResolvedValue({
      id: 'clan-1',
      name: 'Moon Guard',
      tag: 'MOON',
      description: '',
      activityPoints: 0,
      activeBannerCode: null,
      bannerUnlocks: [],
      members: [
        {
          gameProfileId: 7,
          role: ClanRole.LEADER,
          contributedActivity: 0,
          joinedAt: new Date(),
          gameProfile: { level: 10, user: { name: 'Hero' } },
        },
      ],
    });
    transaction.mockImplementation((callback: (client: unknown) => unknown) =>
      callback({ clanMember: { update: clanMemberUpdate }, clan: { update: clanUpdate } }),
    );
  });

  it('requires level 10 to create a clan', async () => {
    gameProfileFindUnique.mockResolvedValue({ ...profile, level: CLAN_MIN_LEVEL - 1 });
    await expect(service.createClan(4, { name: 'Moon Guard', tag: 'MOON', description: '' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(clanCreate).not.toHaveBeenCalled();
  });

  it('creates the founder as leader and snapshots existing activity', async () => {
    await service.createClan(4, { name: 'Moon Guard', tag: 'MOON', description: '' });
    expect(clanCreate).toHaveBeenCalledWith({
      data: {
        name: 'Moon Guard',
        tag: 'MOON',
        description: '',
        members: {
          create: {
            gameProfileId: 7,
            role: ClanRole.LEADER,
            trackedKilledMonsters: 12,
            trackedDungeonsCleared: 2,
            trackedQuestsCompleted: 5,
            trackedPvpVictories: 3,
          },
        },
      },
      select: { id: true },
    });
  });

  it('converts new game achievements into shared clan activity', async () => {
    gameProfileFindUnique.mockResolvedValue({
      ...profile,
      clanMembership: { clanId: 'clan-1', gameProfileId: 7, role: ClanRole.MEMBER },
    });
    clanMemberFindMany.mockResolvedValue([
      {
        clanId: 'clan-1',
        gameProfileId: 7,
        trackedKilledMonsters: 12,
        trackedDungeonsCleared: 2,
        trackedQuestsCompleted: 5,
        trackedPvpVictories: 3,
        gameProfile: {
          killedMonsters: 13,
          dungeonsCleared: 3,
          coinsOfHonour: 4,
          _count: { quests: 6 },
        },
      },
    ]);

    await service.getMyClan(4);

    const expected =
      CLAN_ACTIVITY_REWARDS.monsterKill +
      CLAN_ACTIVITY_REWARDS.dungeon +
      CLAN_ACTIVITY_REWARDS.quest +
      CLAN_ACTIVITY_REWARDS.pvpVictory;
    expect(clanMemberUpdate).toHaveBeenCalledWith({
      where: { gameProfileId: 7 },
      data: {
        contributedActivity: { increment: expected },
        trackedKilledMonsters: 13,
        trackedDungeonsCleared: 3,
        trackedQuestsCompleted: 6,
        trackedPvpVictories: 4,
      },
    });
    expect(clanUpdate).toHaveBeenCalledWith({
      where: { id: 'clan-1' },
      data: { activityPoints: { increment: expected } },
    });
  });
});
