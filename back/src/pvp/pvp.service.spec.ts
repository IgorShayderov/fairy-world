import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { PvpService, PVP_REFRESH_GEMS_COST, PVP_RESET_COOLDOWN_GEMS_COST } from './pvp.service';

describe('PvpService', () => {
  let pvpService: PvpService;
  const mockUserFindMany = jest.fn();
  const mockGameProfileUpdate = jest.fn();
  const mockTransaction = jest.fn();
  const mockFindCurrentUser = jest.fn();

  const mockPrisma = {
    user: { findMany: mockUserFindMany },
    gameProfile: { update: mockGameProfileUpdate },
    $transaction: mockTransaction,
  } as unknown as PrismaService;

  const mockUsers = {
    findCurrentUser: mockFindCurrentUser,
  } as unknown as UsersService;

  const mockCurrentUser = {
    id: 1,
    name: 'Hero',
    email: 'hero@test.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    gameProfile: {
      id: 10,
      userId: 1,
      level: 10,
      gold: 500,
      gems: 50,
      coinsOfHonour: 0,
      pvpCooldownUntil: null,
      experience: 1000,
      freeAttributes: 0,
      killedMonsters: 20,
      dungeonsCleared: 1,
      mapPositionX: 1470,
      mapPositionY: 960,
      inventory: [],
      profileAttributes: [],
      profileStats: [],
      buffs: [],
      dungeonVisits: [],
      sanctuaryVisits: [],
      craftItems: [],
      dungeonRun: null,
      dungeonParty: null,
      _count: { quests: 0 },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserFindMany.mockResolvedValue([]);
    mockGameProfileUpdate.mockResolvedValue({ id: 10, level: 10, experience: 1200, gems: 20 });
    mockTransaction.mockImplementation((callback: (client: typeof mockPrisma) => unknown) => callback(mockPrisma));
    mockFindCurrentUser.mockResolvedValue(mockCurrentUser);

    pvpService = new PvpService(mockPrisma, mockUsers);
  });

  afterEach(() => {
    pvpService.onModuleDestroy();
  });

  describe('getOpponents and matchmaking', () => {
    it('returns 3 opponents with bot levels in range [playerLevel, playerLevel + 5] and 0 gold rewards', async () => {
      mockUserFindMany.mockResolvedValue([]);

      const opponents = await pvpService.getOpponents(1);

      expect(opponents).toHaveLength(3);
      for (const opp of opponents) {
        expect(opp.isBot).toBe(true);
        expect(opp.level).toBeGreaterThanOrEqual(10);
        expect(opp.level).toBeLessThanOrEqual(15);
        expect(opp.rewards.gold).toBe(0);
        expect(opp.rewards.experience).toBeGreaterThan(0);
      }
    });

    it('makes generated opponents tougher without increasing their damage formula', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      try {
        const [opponent] = await pvpService.getOpponents(1);

        expect(opponent.level).toBe(10);
        expect(opponent.difficulty).toBe('MEDIUM');
        expect(opponent.damage).toBe(39);
        expect(opponent.health).toBe(301);
        expect(opponent.defense).toBe(27);
        expect(opponent.dodge).toBe(13);
      } finally {
        randomSpy.mockRestore();
      }
    });

    it('matches real players within level range [playerLevel - 2, playerLevel + 3]', async () => {
      const realPlayer = {
        id: 2,
        name: 'RealChampion',
        email: 'real@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        gameProfile: {
          id: 20,
          userId: 2,
          level: 11,
          inventory: [],
          profileAttributes: [],
          profileStats: [],
          buffs: [],
          dungeonVisits: [],
          sanctuaryVisits: [],
          craftItems: [],
          dungeonRun: null,
          dungeonParty: null,
          _count: { quests: 0 },
        },
      };

      mockUserFindMany.mockResolvedValue([realPlayer]);

      const opponents = await pvpService.getOpponents(1);

      expect(opponents).toHaveLength(3);
      const realMatch = opponents.find((o) => !o.isBot);
      expect(realMatch).toBeDefined();
      expect(realMatch?.name).toBe('RealChampion');
      expect(realMatch?.level).toBe(11);
      expect(realMatch?.rewards.gold).toBe(0);
    });

    it('shuffles opponents when day changes', async () => {
      const firstCall = await pvpService.getOpponents(1);
      expect(firstCall).toHaveLength(3);

      // Simulate day change
      pvpService.setCachedDayKey(1, '2020-01-01');

      const secondCall = await pvpService.getOpponents(1);
      expect(secondCall).toHaveLength(3);
      expect(mockFindCurrentUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshOpponents with 30 gems cost', () => {
    it('deducts 30 gems and returns 3 new opponents', async () => {
      const opponents = await pvpService.refreshOpponents(1);

      expect(opponents).toHaveLength(3);
      expect(mockGameProfileUpdate).toHaveBeenCalled();
      const calls = mockGameProfileUpdate.mock.calls as Array<
        [{ where: { id: number }; data: { gems: { decrement: number } } }]
      >;
      expect(calls[0][0].data.gems.decrement).toBe(PVP_REFRESH_GEMS_COST);
    });

    it('throws BadRequestException if player has fewer than 30 gems', async () => {
      mockFindCurrentUser.mockResolvedValue({
        ...mockCurrentUser,
        gameProfile: {
          ...mockCurrentUser.gameProfile,
          gems: 25,
        },
      });

      await expect(pvpService.refreshOpponents(1)).rejects.toThrow();
      expect(mockGameProfileUpdate).not.toHaveBeenCalled();
    });
  });

  describe('resetCooldown with 10 gems cost', () => {
    it('deducts 10 gems and clears cooldown timer', async () => {
      const result = await pvpService.resetCooldown(1);

      expect(result.success).toBe(true);
      expect(result.pvpCooldownUntil).toBeNull();
      expect(mockGameProfileUpdate).toHaveBeenCalled();
      const calls = mockGameProfileUpdate.mock.calls as Array<
        [{ where: { id: number }; data: { gems: { decrement: number }; pvpCooldownUntil: null } }]
      >;
      expect(calls[0][0].data.gems.decrement).toBe(PVP_RESET_COOLDOWN_GEMS_COST);
      expect(calls[0][0].data.pvpCooldownUntil).toBeNull();
    });

    it('throws BadRequestException if player has fewer than 10 gems', async () => {
      mockFindCurrentUser.mockResolvedValue({
        ...mockCurrentUser,
        gameProfile: {
          ...mockCurrentUser.gameProfile,
          gems: 5,
        },
      });

      await expect(pvpService.resetCooldown(1)).rejects.toThrow();
    });
  });

  describe('duel', () => {
    it('throws BadRequestException if attack is on cooldown', async () => {
      await pvpService.getOpponents(1);

      mockFindCurrentUser.mockResolvedValue({
        ...mockCurrentUser,
        gameProfile: {
          ...mockCurrentUser.gameProfile,
          pvpCooldownUntil: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const opponents = pvpService.getUserOpponents(1);
      expect(opponents).toBeDefined();
      if (!opponents) return;
      await expect(pvpService.duel(1, opponents[0].id)).rejects.toThrow();
    });

    it('executes a duel, gives 1 coin of honour, sets 15 min cooldown, and replaces defeated opponent in place', async () => {
      const opponents = await pvpService.getOpponents(1);
      const chosenOpponent = opponents[1]; // target slot 1

      mockFindCurrentUser.mockResolvedValue({
        ...mockCurrentUser,
        gameProfile: {
          ...mockCurrentUser.gameProfile,
          pvpCooldownUntil: null,
          profileStats: [
            { stat: { name: 'DAMAGE' }, value: 9999 },
            { stat: { name: 'HEALTH' }, value: 9999 },
          ],
        },
      });

      const result = await pvpService.duel(1, chosenOpponent.id);

      expect(result.status).toBe('VICTORY');
      expect(result.rewards?.gold).toBe(0);
      expect(result.rewards?.coinsOfHonour).toBe(1);
      expect(result.rewards?.experience).toBe(chosenOpponent.rewards.experience);
      expect(result.cooldownUntil).toBeDefined();

      expect(mockGameProfileUpdate).toHaveBeenCalled();
      const calls = mockGameProfileUpdate.mock.calls as Array<
        [{ where: { id: number }; data: { coinsOfHonour: { increment: number }; pvpCooldownUntil: Date } }]
      >;
      expect(calls[0][0].data.coinsOfHonour.increment).toBe(1);
      expect(calls[0][0].data.pvpCooldownUntil).toBeInstanceOf(Date);

      // Opponent at slot 1 replaced in place by a new opponent
      const currentOpponents = pvpService.getUserOpponents(1);
      expect(currentOpponents).toHaveLength(3);
      if (currentOpponents) {
        expect(currentOpponents[1].id).not.toBe(chosenOpponent.id);
        expect(currentOpponents[0].id).toBe(opponents[0].id);
        expect(currentOpponents[2].id).toBe(opponents[2].id);
      }
    });
  });
});
