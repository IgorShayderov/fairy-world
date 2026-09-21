import { ItemRarity, StatType } from '../../generated/client';
import { DungeonRunsService, type DungeonRunState } from './dungeon-runs.service';

describe('DungeonRunsService', () => {
  let storedRun: { id: string; state: DungeonRunState } | null;
  let service: DungeonRunsService;

  const prisma = {
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
    dungeonRun: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dungeonVisit: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    gameProfile: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    gameProfileBuff: { deleteMany: jest.fn(), create: jest.fn() },
    inventoryItem: { count: jest.fn(), create: jest.fn() },
  };
  const monsterGenerator = { generate: jest.fn() };
  const usersService = { findCurrentUser: jest.fn() };
  const itemGenerator = { generate: jest.fn() };

  const user = {
    id: 7,
    name: 'Hero',
    email: 'hero@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    gameProfile: {
      id: 5,
      level: 5,
      gold: 0,
      gems: 0,
      experience: 0,
      freeAttributes: 0,
      killedMonsters: 0,
      buffs: [],
      mapPositionX: 2470,
      mapPositionY: 1370,
      inventory: [],
      profileAttributes: [],
      profileStats: [
        { value: 500, stat: { name: StatType.HEALTH, description: null } },
        { value: 50, stat: { name: StatType.DAMAGE, description: null } },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storedRun = null;
    prisma.$transaction.mockImplementation((operation: (client: typeof prisma) => unknown) => operation(prisma));
    prisma.dungeonRun.findUnique.mockImplementation(() =>
      Promise.resolve(storedRun ? { id: storedRun.id, state: storedRun.state } : null),
    );
    prisma.dungeonRun.create.mockImplementation(({ data }: { data: { id: string; state: DungeonRunState } }) => {
      storedRun = { id: data.id, state: data.state };
      return Promise.resolve(storedRun);
    });
    prisma.dungeonRun.update.mockImplementation(({ data }: { data: { state: DungeonRunState } }) => {
      if (storedRun) storedRun.state = data.state;
      return Promise.resolve(storedRun);
    });
    prisma.dungeonRun.delete.mockImplementation(() => {
      storedRun = null;
      return Promise.resolve(null);
    });
    prisma.dungeonVisit.findUnique.mockResolvedValue(null);
    prisma.gameProfile.findUnique.mockImplementation(() =>
      Promise.resolve({ id: 5, userId: 7, mapPositionX: 2470, mapPositionY: 1370, dungeonRun: storedRun }),
    );
    prisma.gameProfile.update.mockResolvedValue({ id: 5, level: 5, experience: 0 });
    prisma.inventoryItem.count.mockResolvedValue(0);
    prisma.inventoryItem.create.mockResolvedValue({ id: 91 });
    usersService.findCurrentUser.mockResolvedValue(user);
    monsterGenerator.generate.mockImplementation((level: number) => ({
      id: level,
      monsterType: 'Guardian',
      name: 'Guardian',
      description: '',
      level,
      rewardGold: 20,
      rewardExperience: 30,
      attributes: [],
    }));
    itemGenerator.generate.mockResolvedValue({
      id: 44,
      name: 'Warden Blade',
      description: 'Rare blade',
      price: 500,
      icon: 'icon_sword.png',
      isConsumable: false,
      rarity: ItemRarity.RARE,
      equipmentType: ['WEAPON'],
      level: 9,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [],
      stats: [],
    });
    service = new DungeonRunsService(
      prisma as never,
      monsterGenerator as never,
      usersService as never,
      itemGenerator as never,
    );
  });

  it('persists four opponents and restores the same unfinished run', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    expect(run.opponents).toHaveLength(4);
    expect(run.opponents.filter(({ isBoss }) => !isBoss).every(({ status }) => status === 'AVAILABLE')).toBe(true);
    expect(run.opponents.find(({ isBoss }) => isBoss)?.status).toBe('LOCKED');
    await expect(service.active(7)).resolves.toMatchObject({ id: run.id, dungeon: 'EMBERDEEP' });
    expect(monsterGenerator.generate).toHaveBeenCalledTimes(4);
  });

  it('awards only experience for guardians, unlocks the boss, then guarantees final gold and Rare loot', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.damage = 1_000_000;
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    await expect(service.attack(7, run.id, boss.id)).rejects.toThrow('Defeat the three guardians');

    for (const guardian of run.opponents.filter(({ isBoss }) => !isBoss)) {
      const result = await service.attack(7, run.id, guardian.id);
      expect(result.lastExperience).toBeGreaterThan(0);
      expect(result.rewards).toBeNull();
    }
    expect(storedRun?.state.opponents.find(({ isBoss }) => isBoss)?.status).toBe('AVAILABLE');
    expect(itemGenerator.generate).not.toHaveBeenCalled();

    const completed = await service.attack(7, run.id, boss.id);
    expect(completed.status).toBe('VICTORY');
    expect(typeof completed.rewards?.gold).toBe('number');
    expect(completed.rewards?.item).toMatchObject({ id: 44, rarity: ItemRarity.RARE, addedToInventory: true });
    expect(itemGenerator.generate).toHaveBeenCalledWith(
      { level: boss.monster.level, rarity: ItemRarity.RARE, minimumRarity: ItemRarity.RARE },
      prisma,
    );
    expect(storedRun).toBeNull();
  });

  it('keeps the boss alive until there is room for the guaranteed reward', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.damage = 1_000_000;
    for (const guardian of run.opponents.filter(({ isBoss }) => !isBoss)) {
      await service.attack(7, run.id, guardian.id);
    }
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    prisma.inventoryItem.count.mockResolvedValue(24);

    await expect(service.attack(7, run.id, boss.id)).rejects.toThrow(
      'Inventory is full. Make room before fighting the boss.',
    );
    expect(boss.status).toBe('AVAILABLE');
    expect(boss.monster.health).toBe(boss.monster.maxHealth);
    expect(itemGenerator.generate).not.toHaveBeenCalled();
  });
});
