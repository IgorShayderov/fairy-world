import { ForbiddenException } from '@nestjs/common';
import { ClanRole } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { clanBuildingUpgradeCost } from './clan-buildings';
import { CLAN_ACTIVITY_REWARDS, CLAN_MIN_LEVEL, ClansService } from './clans.service';

describe('ClansService', () => {
  const gameProfileFindUnique = jest.fn();
  const clanFindFirst = jest.fn();
  const clanFindMany = jest.fn();
  const clanCreate = jest.fn();
  const clanFindUnique = jest.fn();
  const clanMemberFindMany = jest.fn();
  const clanMemberUpdate = jest.fn();
  const clanUpdate = jest.fn();
  const clanUpdateMany = jest.fn();
  const gameProfileUpdateMany = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    gameProfile: { findUnique: gameProfileFindUnique },
    clan: {
      findFirst: clanFindFirst,
      findMany: clanFindMany,
      create: clanCreate,
      findUnique: clanFindUnique,
      update: clanUpdate,
      updateMany: clanUpdateMany,
    },
    clanMember: { findMany: clanMemberFindMany, update: clanMemberUpdate },
    $transaction: transaction,
  } as unknown as PrismaService;
  let service: ClansService;

  it('starts building upgrades at 2,500 gold', () => {
    expect(clanBuildingUpgradeCost(0)).toBe(2_500);
  });

  const profile = {
    id: 7,
    userId: 4,
    level: 10,
    gold: 10_000,
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
      treasureLevel: 0,
      armoryLevel: 0,
      activeBannerCode: null,
      bannerUnlocks: [],
      members: [
        {
          gameProfileId: 7,
          role: ClanRole.LEADER,
          contributedActivity: 0,
          contributedGold: 0,
          joinedAt: new Date(),
          gameProfile: { level: 10, user: { name: 'Hero' } },
        },
      ],
    });
    gameProfileUpdateMany.mockResolvedValue({ count: 1 });
    clanUpdateMany.mockResolvedValue({ count: 1 });
    transaction.mockImplementation((callback: (client: unknown) => unknown) =>
      callback({
        gameProfile: { updateMany: gameProfileUpdateMany },
        clanMember: { update: clanMemberUpdate },
        clan: { findUnique: clanFindUnique, update: clanUpdate, updateMany: clanUpdateMany },
      }),
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

  it('ranks clans by activity and marks the current clan', async () => {
    gameProfileFindUnique.mockResolvedValue({
      ...profile,
      clanMembership: { clanId: 'clan-1', gameProfileId: 7, role: ClanRole.MEMBER },
    });
    clanFindMany.mockResolvedValueOnce([{ id: 'clan-1' }, { id: 'clan-2' }]).mockResolvedValueOnce([
      {
        id: 'clan-2',
        name: 'Sun Guard',
        tag: 'SUN',
        activityPoints: 500,
        activeBannerCode: null,
        _count: { members: 12 },
      },
      {
        id: 'clan-1',
        name: 'Moon Guard',
        tag: 'MOON',
        activityPoints: 340,
        activeBannerCode: 'IRON_OATH',
        _count: { members: 8 },
      },
    ]);
    clanMemberFindMany.mockResolvedValue([]);

    await expect(service.getLeaderboard(4)).resolves.toEqual([
      {
        rank: 1,
        id: 'clan-2',
        name: 'Sun Guard',
        tag: 'SUN',
        activityPoints: 500,
        activeBannerCode: null,
        memberCount: 12,
        isCurrent: false,
      },
      {
        rank: 2,
        id: 'clan-1',
        name: 'Moon Guard',
        tag: 'MOON',
        activityPoints: 340,
        activeBannerCode: 'IRON_OATH',
        memberCount: 8,
        isCurrent: true,
      },
    ]);
    expect(clanMemberFindMany).toHaveBeenCalledTimes(2);
  });

  it('lets every member spend personal gold to upgrade a shared building', async () => {
    gameProfileFindUnique.mockResolvedValue({
      ...profile,
      clanMembership: { clanId: 'clan-1', gameProfileId: 7, role: ClanRole.MEMBER },
    });
    clanFindUnique.mockResolvedValueOnce({ treasureLevel: 2, armoryLevel: 1 }).mockResolvedValueOnce({
      id: 'clan-1',
      name: 'Moon Guard',
      tag: 'MOON',
      description: '',
      activityPoints: 0,
      treasureLevel: 3,
      armoryLevel: 1,
      activeBannerCode: null,
      bannerUnlocks: [],
      members: [
        {
          gameProfileId: 7,
          role: ClanRole.MEMBER,
          contributedActivity: 0,
          contributedGold: clanBuildingUpgradeCost(2),
          joinedAt: new Date(),
          gameProfile: { gold: 9_000, level: 10, user: { name: 'Hero' } },
        },
      ],
    });
    clanMemberFindMany.mockResolvedValue([]);

    const result = await service.upgradeBuilding(4, 'treasure');

    expect(gameProfileUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, gold: { gte: clanBuildingUpgradeCost(2) } },
      data: { gold: { decrement: clanBuildingUpgradeCost(2) } },
    });
    expect(clanUpdateMany).toHaveBeenCalledWith({
      where: { id: 'clan-1', treasureLevel: 2 },
      data: { treasureLevel: { increment: 1 } },
    });
    expect(clanMemberUpdate).toHaveBeenCalledWith({
      where: { gameProfileId: 7 },
      data: { contributedGold: { increment: clanBuildingUpgradeCost(2) } },
    });
    expect(result.clan?.buildings.treasure).toEqual({
      level: 3,
      bonusPercent: 6,
      nextCost: clanBuildingUpgradeCost(3),
    });
  });
});
