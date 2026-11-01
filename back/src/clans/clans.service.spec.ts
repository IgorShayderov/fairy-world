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
  const clanMemberFindUnique = jest.fn();
  const clanMemberUpdate = jest.fn();
  const clanMemberCreate = jest.fn();
  const clanUpdate = jest.fn();
  const clanUpdateMany = jest.fn();
  const clanBannerUnlockCreate = jest.fn();
  const clanBannerUnlockCreateMany = jest.fn();
  const gameProfileUpdateMany = jest.fn();
  const transaction = jest.fn();
  const lockActivity = jest.fn();
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
    clanMember: { findMany: clanMemberFindMany, update: clanMemberUpdate, create: clanMemberCreate },
    clanBannerUnlock: { create: clanBannerUnlockCreate, createMany: clanBannerUnlockCreateMany },
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
    gems: 100,
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
      treasuryGold: 10000,
      treasuryGems: 100,
      activeBannerCode: null,
      bannerUnlocks: [],
      members: [
        {
          gameProfileId: 7,
          role: ClanRole.LEADER,
          contributedActivity: 0,
          contributedGold: 0,
          contributedGems: 0,
          joinedAt: new Date(),
          gameProfile: { level: 10, user: { name: 'Hero' } },
        },
      ],
    });
    gameProfileUpdateMany.mockResolvedValue({ count: 1 });
    clanMemberFindUnique.mockResolvedValue({ clanId: 'clan-1', gameProfileId: 7, role: ClanRole.LEADER });
    clanMemberFindMany.mockResolvedValue([]);
    clanUpdateMany.mockResolvedValue({ count: 1 });
    transaction.mockImplementation((callback: (client: unknown) => unknown) =>
      callback({
        gameProfile: { updateMany: gameProfileUpdateMany },
        clanMember: { update: clanMemberUpdate, findMany: clanMemberFindMany, findUnique: clanMemberFindUnique },
        $executeRaw: lockActivity,
        $queryRaw: jest.fn(),
        clanBannerUnlock: { create: clanBannerUnlockCreate },
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

  it('snapshots lifetime achievements when joining another clan', async () => {
    clanFindUnique.mockResolvedValueOnce({ id: 'clan-1', _count: { members: 2 } });
    await service.joinClan(4, 'clan-1');
    expect(clanMemberCreate).toHaveBeenCalledWith({
      data: {
        clanId: 'clan-1',
        gameProfileId: 7,
        role: ClanRole.MEMBER,
        trackedKilledMonsters: 12,
        trackedDungeonsCleared: 2,
        trackedQuestsCompleted: 5,
        trackedPvpVictories: 3,
      },
    });
    expect(clanUpdate).not.toHaveBeenCalled();
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

  it('does not credit lifetime achievements present when a member joined', async () => {
    gameProfileFindUnique.mockResolvedValue({ ...profile, clanMembership: { clanId: 'clan-1' } });
    clanMemberFindMany.mockResolvedValue([
      {
        gameProfileId: 7,
        trackedKilledMonsters: 787,
        trackedDungeonsCleared: 24,
        trackedQuestsCompleted: 21,
        trackedPvpVictories: 3,
        gameProfile: { killedMonsters: 787, dungeonsCleared: 24, coinsOfHonour: 3, _count: { quests: 21 } },
      },
    ]);

    const result = await service.getMyClan(4);
    expect(result.clan?.members[0]?.contributedActivity).toBe(0);
    expect(clanMemberUpdate).not.toHaveBeenCalled();
    expect(clanUpdate).not.toHaveBeenCalled();
    expect(lockActivity).toHaveBeenCalledTimes(1);
    expect(lockActivity.mock.invocationCallOrder[0]).toBeLessThan(clanMemberFindMany.mock.invocationCallOrder[0]);
  });

  it('credits only new achievements and does not credit them again on refresh', async () => {
    gameProfileFindUnique.mockResolvedValue({ ...profile, clanMembership: { clanId: 'clan-1' } });
    const member = {
      gameProfileId: 7,
      trackedKilledMonsters: 787,
      trackedDungeonsCleared: 24,
      trackedQuestsCompleted: 21,
      trackedPvpVictories: 3,
      gameProfile: { killedMonsters: 790, dungeonsCleared: 24, coinsOfHonour: 3, _count: { quests: 21 } },
    };
    clanMemberFindMany
      .mockResolvedValueOnce([member])
      .mockResolvedValueOnce([{ ...member, trackedKilledMonsters: 790 }]);
    await service.getMyClan(4);
    await service.getMyClan(4);
    expect(clanUpdate).toHaveBeenCalledTimes(1);
    expect(clanUpdate).toHaveBeenCalledWith({ where: { id: 'clan-1' }, data: { activityPoints: { increment: 3 } } });
    expect(clanMemberUpdate).toHaveBeenCalledTimes(1);
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

  it('lets only the leader spend treasury gold to upgrade a shared building', async () => {
    gameProfileFindUnique.mockResolvedValue({
      ...profile,
      clanMembership: { clanId: 'clan-1', gameProfileId: 7, role: ClanRole.LEADER },
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

    expect(gameProfileUpdateMany).not.toHaveBeenCalled();
    expect(clanUpdateMany).toHaveBeenCalledWith({
      where: { id: 'clan-1', treasureLevel: 2, treasuryGold: { gte: clanBuildingUpgradeCost(2) } },
      data: { treasureLevel: { increment: 1 }, treasuryGold: { decrement: clanBuildingUpgradeCost(2) } },
    });
    expect(clanMemberUpdate).not.toHaveBeenCalled();
    expect(result.clan?.buildings.treasure).toEqual({
      level: 3,
      bonusPercent: 6,
      nextCost: clanBuildingUpgradeCost(3),
    });
  });

  it.each([ClanRole.MEMBER, ClanRole.OFFICER])('rejects %s building upgrades on the server', async (role) => {
    gameProfileFindUnique.mockResolvedValue({ ...profile, clanMembership: { clanId: 'clan-1' } });
    clanMemberFindUnique.mockResolvedValue({ clanId: 'clan-1', role });
    await expect(service.upgradeBuilding(4, 'armory')).rejects.toThrow('Only the clan leader');
    expect(clanUpdateMany).not.toHaveBeenCalled();
    expect(gameProfileUpdateMany).not.toHaveBeenCalled();
  });

  it('does not fall back to the leader wallet when treasury funds are insufficient', async () => {
    gameProfileFindUnique.mockResolvedValue({ ...profile, clanMembership: { clanId: 'clan-1' } });
    clanUpdateMany.mockResolvedValue({ count: 0 });
    await expect(service.upgradeBuilding(4, 'armory')).rejects.toThrow('treasury needs');
    expect(gameProfileUpdateMany).not.toHaveBeenCalled();
  });

  it.each([ClanRole.LEADER, ClanRole.OFFICER, ClanRole.MEMBER])(
    '%s can permanently deposit both currencies',
    async (role) => {
      gameProfileFindUnique.mockResolvedValue({ ...profile, clanMembership: { clanId: 'clan-1' } });
      clanMemberFindUnique.mockResolvedValue({ clanId: 'clan-1', role });
      const result = await service.depositTreasury(4, 300, 5);
      expect(gameProfileUpdateMany).toHaveBeenCalledWith({
        where: { id: 7, gold: { gte: 300 }, gems: { gte: 5 } },
        data: { gold: { decrement: 300 }, gems: { decrement: 5 } },
      });
      expect(clanUpdateMany).toHaveBeenCalledWith({
        where: { id: 'clan-1', treasuryGold: { lte: 2147483347 }, treasuryGems: { lte: 2147483642 } },
        data: { treasuryGold: { increment: 300 }, treasuryGems: { increment: 5 } },
      });
      expect(clanMemberUpdate).toHaveBeenCalledWith({
        where: { gameProfileId: 7 },
        data: {
          contributedGold: { increment: 300 },
          contributedGems: { increment: 5 },
        },
      });
      expect(result.clan?.treasury).toEqual({ gold: 10000, gems: 100 });
    },
  );

  it.each([
    [0, 0],
    [-1, 0],
    [0, -1],
    [1.5, 0],
    [NaN, 1],
    [Infinity, 0],
    [2147483648, 0],
  ])('rejects invalid or withdrawal amounts %s / %s', async (gold, gems) => {
    await expect(service.depositTreasury(4, gold, gems)).rejects.toThrow('positive whole');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects non-members and membership changes before any charge', async () => {
    await expect(service.depositTreasury(4, 1, 0)).rejects.toThrow('not in a clan');
    gameProfileFindUnique.mockResolvedValue({ ...profile, clanMembership: { clanId: 'clan-1' } });
    clanMemberFindUnique.mockResolvedValue({ clanId: 'another-clan', role: ClanRole.LEADER });
    await expect(service.depositTreasury(4, 1, 0)).rejects.toThrow('membership changed');
    await expect(service.upgradeBuilding(4, 'armory')).rejects.toThrow('membership changed');
    expect(gameProfileUpdateMany).not.toHaveBeenCalled();
    expect(clanUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects insufficient personal funds before crediting the treasury', async () => {
    gameProfileFindUnique.mockResolvedValue({ ...profile, clanMembership: { clanId: 'clan-1' } });
    gameProfileUpdateMany.mockResolvedValue({ count: 0 });
    await expect(service.depositTreasury(4, 10001, 0)).rejects.toThrow('Not enough');
    expect(clanUpdateMany).not.toHaveBeenCalled();
    expect(clanMemberUpdate).not.toHaveBeenCalled();
  });

  it('unlocks a reached banner milestone without spending clan activity', async () => {
    gameProfileFindUnique.mockResolvedValue({
      ...profile,
      clanMembership: { clanId: 'clan-1', gameProfileId: 7, role: ClanRole.LEADER },
    });
    clanMemberFindMany.mockResolvedValue([]);
    clanFindUnique
      .mockResolvedValueOnce({ id: 'clan-1', activityPoints: 180, bannerUnlocks: [] })
      .mockResolvedValueOnce({
        id: 'clan-1',
        activityPoints: 180,
        activeBannerCode: 'IRON_OATH',
        bannerUnlocks: [{ bannerCode: 'IRON_OATH' }],
      });

    const result = await service.buyBanner(4, 'IRON_OATH');

    expect(clanBannerUnlockCreate).toHaveBeenCalledWith({
      data: { clanId: 'clan-1', bannerCode: 'IRON_OATH' },
    });
    expect(clanUpdate).toHaveBeenCalledWith({
      where: { id: 'clan-1' },
      data: { activeBannerCode: 'IRON_OATH' },
    });
    expect(result.activityPoints).toBe(180);
    expect(result.banners.find((banner) => banner.code === 'IRON_OATH')?.unlocked).toBe(true);
  });

  it('automatically equips the first earned banner when the clan has none', async () => {
    gameProfileFindUnique.mockResolvedValue({
      ...profile,
      clanMembership: { clanId: 'clan-1', gameProfileId: 7, role: ClanRole.MEMBER },
    });
    clanMemberFindMany.mockResolvedValue([]);
    clanFindUnique.mockResolvedValueOnce({
      id: 'clan-1',
      activityPoints: 180,
      activeBannerCode: null,
      bannerUnlocks: [],
    });

    const result = await service.getShop(4);

    expect(clanBannerUnlockCreateMany).toHaveBeenCalledWith({
      data: [{ clanId: 'clan-1', bannerCode: 'IRON_OATH' }],
      skipDuplicates: true,
    });
    expect(clanUpdate).toHaveBeenCalledWith({
      where: { id: 'clan-1' },
      data: { activeBannerCode: 'IRON_OATH' },
    });
    expect(result.activeBannerCode).toBe('IRON_OATH');
  });
});
