import { ItemRarity, StatType } from '../../generated/client';
import { requiredPlayerLevel } from '../users/level-progression';
import { DUNGEON_ROSTERS, DungeonRunsService, type DungeonRunState } from './dungeon-runs.service';

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
    dungeonParty: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    dungeonPartyMember: { findUnique: jest.fn(), findFirst: jest.fn() },
    dungeonVisit: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    gameProfile: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    gameProfileBuff: { deleteMany: jest.fn(), create: jest.fn() },
    inventoryItem: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    craftItem: { findUnique: jest.fn() },
    playerCraftItem: { upsert: jest.fn() },
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
    user.gameProfile.level = 5;
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
    prisma.dungeonParty.findUnique.mockResolvedValue(null);
    prisma.dungeonPartyMember.findUnique.mockResolvedValue(null);
    prisma.dungeonPartyMember.findFirst.mockResolvedValue(null);
    prisma.gameProfile.findUnique.mockImplementation(() =>
      Promise.resolve({
        id: 5,
        userId: 7,
        level: user.gameProfile.level,
        mapPositionX: 2470,
        mapPositionY: 1370,
        dungeonRun: storedRun,
      }),
    );
    prisma.gameProfile.update.mockResolvedValue({ id: 5, level: 5, experience: 0 });
    prisma.gameProfile.findUniqueOrThrow.mockResolvedValue({ level: 5 });
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

  it('creates a waiting dungeon party with the creator as leader', async () => {
    prisma.dungeonParty.create.mockResolvedValue({
      id: 'party-1',
      dungeon: 'EMBERDEEP',
      status: 'WAITING',
      leaderProfileId: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          partyId: 'party-1',
          gameProfileId: 5,
          joinedAt: new Date(),
          gameProfile: { id: 5, userId: 7, level: 5, user: { name: 'Hero' } },
        },
      ],
    });

    await expect(service.createParty(7, 'EMBERDEEP')).resolves.toMatchObject({
      id: 'party-1',
      status: 'WAITING',
      isLeader: true,
      members: [{ name: 'Hero', leader: true }],
    });
  });

  it('persists four opponents and restores the same unfinished run', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    expect(run.opponents).toHaveLength(4);
    expect(run.opponents.filter(({ isBoss }) => !isBoss).every(({ status }) => status === 'AVAILABLE')).toBe(true);
    expect(run.opponents.find(({ isBoss }) => isBoss)?.status).toBe('LOCKED');
    await expect(service.active(7)).resolves.toMatchObject({ id: run.id, dungeon: 'EMBERDEEP' });
    expect(monsterGenerator.generate).toHaveBeenCalledTimes(4);
  });

  it('defines a completely distinct four-monster roster for every dungeon', () => {
    expect(Object.keys(DUNGEON_ROSTERS).sort()).toEqual(['EMBERDEEP', 'HOLLOWGATE', 'ICEVAULT', 'RAVENCRYPT']);
    expect(Object.values(DUNGEON_ROSTERS).every((roster) => roster.length === 4)).toBe(true);
    const roles = Object.values(DUNGEON_ROSTERS).flat();
    expect(new Set(roles.map(({ name }) => name))).toHaveProperty('size', 16);
    expect(new Set(roles.map(({ image }) => image))).toHaveProperty('size', 16);
    expect(Object.values(DUNGEON_ROSTERS).every((roster) => roster.filter(({ boss }) => boss).length === 1)).toBe(true);
  });

  it('updates names and artwork in a persisted legacy run without resetting its progress', async () => {
    await service.enter(7, 'EMBERDEEP');
    storedRun!.state.opponents[0].monsterType = 'Legacy monster';
    storedRun!.state.opponents[0].image = '/images/dungeons/legacy.webp';
    storedRun!.state.opponents[0].status = 'DEFEATED';

    const restored = await service.active(7);
    expect(restored?.opponents[0]).toMatchObject({
      image: DUNGEON_ROSTERS.EMBERDEEP[0].image,
      status: 'DEFEATED',
      monster: { name: DUNGEON_ROSTERS.EMBERDEEP[0].name },
    });
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
      expect(result.lastBattleResult).toEqual({ winner: 'PLAYER', winnerName: 'Hero' });
    }
    expect(storedRun?.state.opponents.find(({ isBoss }) => isBoss)?.status).toBe('AVAILABLE');
    expect(itemGenerator.generate).not.toHaveBeenCalled();

    const completed = await service.attack(7, run.id, boss.id);
    expect(completed.status).toBe('VICTORY');
    expect(typeof completed.rewards?.gold).toBe('number');
    expect(completed.rewards?.items[0]).toMatchObject({ id: 44, rarity: ItemRarity.RARE, addedToInventory: true });
    expect(completed.rewards!.gold).toBe(run.opponents.reduce((sum, entry) => sum + entry.monster.rewardGold, 0) * 2);
    const rewardLevel = Array.from({ length: boss.monster.level }, (_, index) => boss.monster.level - index).find(
      (level) => requiredPlayerLevel(level) <= user.gameProfile.level,
    );
    expect(itemGenerator.generate).toHaveBeenCalledWith(
      { level: rewardLevel, rarity: ItemRarity.RARE, minimumRarity: ItemRarity.RARE },
      prisma,
    );
    expect(storedRun).toBeNull();
  });

  it('can award a second Rare item and guaranteed crafting materials to level 10 players', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    user.gameProfile.level = 10;
    prisma.craftItem.findUnique.mockResolvedValue({
      id: 12,
      name: 'Iron Ore',
      description: 'Ore',
      icon: 'craft_iron_ore.png',
      rarity: ItemRarity.COMMON,
    });
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.damage = 1_000_000;
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    let completed = run;
    for (const opponent of run.opponents) completed = await service.attack(7, run.id, opponent.id);

    expect(completed.rewards?.items).toHaveLength(2);
    const rewardLevel = Array.from({ length: boss.monster.level }, (_, index) => boss.monster.level - index).find(
      (level) => requiredPlayerLevel(level) <= user.gameProfile.level,
    );
    expect(itemGenerator.generate).toHaveBeenLastCalledWith(
      { level: rewardLevel, rarity: ItemRarity.RARE, minimumRarity: ItemRarity.RARE },
      prisma,
    );
    expect(completed.rewards?.craftItems).toEqual([expect.objectContaining({ id: 12, name: 'Iron Ore', quantity: 1 })]);
    expect(prisma.playerCraftItem.upsert).toHaveBeenCalledWith({
      where: { gameProfileId_craftItemId: { gameProfileId: 5, craftItemId: 12 } },
      create: { gameProfileId: 5, craftItemId: 12, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
  });

  it('records the monster as the winner when the player loses a fight', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 1;
    run.player.damage = 1;
    const guardian = run.opponents.find(({ isBoss }) => !isBoss)!;

    const defeated = await service.attack(7, run.id, guardian.id);

    expect(defeated.status).toBe('DEFEAT');
    expect(defeated.lastBattleResult).toEqual({ winner: 'MONSTER', winnerName: guardian.monster.name });
  });

  it('resolves and persists one solo combat exchange per attack', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 100_000;
    run.player.maxHealth = 100_000;
    run.player.damage = 1;
    const guardian = run.opponents.find(({ isBoss }) => !isBoss)!;
    const initialPlayerHealth = run.player.health;
    const initialMonsterHealth = guardian.monster.health;

    const firstExchange = await service.attack(7, run.id, guardian.id);

    expect(firstExchange.status).toBe('ACTIVE');
    expect(guardian.status).toBe('AVAILABLE');
    expect(guardian.monster.health).toBeLessThan(initialMonsterHealth);
    expect(run.player.health).toBeLessThan(initialPlayerHealth);
    expect(firstExchange.latestEvents).toHaveLength(2);
    expect(firstExchange.latestEvents.map(({ actor }) => actor)).toEqual(['PLAYER', 'MONSTER']);
    expect(prisma.dungeonRun.update).toHaveBeenCalled();

    const secondExchange = await service.attack(7, run.id, guardian.id);

    expect(secondExchange.latestEvents).toHaveLength(4);
    expect(secondExchange.lastBattleResult).toBeNull();
    expect(secondExchange.lastExperience).toBe(0);
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
      'Make room for up to two dungeon reward items before fighting the boss.',
    );
    expect(boss.status).toBe('AVAILABLE');
    expect(boss.monster.health).toBe(boss.monster.maxHealth);
    expect(itemGenerator.generate).not.toHaveBeenCalled();
  });

  it('awards shared party loot to the only member who requested it after everyone submits', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.status = 'VICTORY';
    run.party = {
      id: run.id,
      members: [
        { profileId: 5, userId: 7, name: 'Hero', level: 5, leader: true },
        { profileId: 6, userId: 8, name: 'Ally', level: 5, leader: false },
      ],
    };
    run.partyRewards = {
      '5': { gold: 40, experience: 100, items: [], craftItems: [] },
      '6': { gold: 40, experience: 100, items: [], craftItems: [] },
    };
    run.partyLoot = {
      status: 'CHOOSING',
      submittedProfileIds: [],
      deadlineAt: new Date(Date.now() + 60_000).toISOString(),
      items: [
        {
          id: 44,
          name: 'Warden Blade',
          description: 'Rare blade',
          price: 500,
          icon: 'icon_sword.png',
          isConsumable: false,
          rarity: ItemRarity.RARE,
          equipmentType: [],
          level: 9,
          requiredPlayerLevel: 7,
          isTwoHanded: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          attributes: [],
          properties: [],
          quantity: 1,
          addedToInventory: false,
          inventoryFull: false,
          claimantProfileIds: [],
        },
      ],
    };
    storedRun!.state = run;
    prisma.dungeonParty.findUnique.mockResolvedValue({
      id: run.id,
      members: [{ gameProfileId: 5 }, { gameProfileId: 6 }],
    });
    prisma.gameProfile.findUnique.mockImplementation(({ where }: { where: { userId: number } }) =>
      Promise.resolve({ id: where.userId === 7 ? 5 : 6 }),
    );

    const waiting = await service.submitPartyLoot(7, run.id, [44]);
    expect(waiting.partyLoot).toMatchObject({ status: 'CHOOSING', submittedProfileIds: [5] });
    expect(prisma.inventoryItem.create).not.toHaveBeenCalled();

    storedRun!.state.partyLoot!.deadlineAt = new Date(Date.now() - 1_000).toISOString();
    prisma.gameProfile.findUnique.mockResolvedValue({
      id: 6,
      dungeonRun: null,
      dungeonParty: { party: { id: run.id, status: 'VICTORY' } },
    });
    const resolved = await service.active(8);
    expect(resolved?.partyLoot).toMatchObject({
      status: 'RESOLVED',
      items: [{ id: 44, claimantProfileIds: [5], winnerProfileId: 5, winnerName: 'Hero' }],
    });
    expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
      data: { gameProfileId: 5, itemId: 44, quantity: 1, slot: null, isEquiped: false },
    });
  });

  it('splits party experience and gold and generates one shared equipment pool', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const run = await service.enter(7, 'EMBERDEEP');
    run.party = {
      id: run.id,
      members: [
        {
          profileId: 5,
          userId: 7,
          name: 'Hero',
          level: 5,
          leader: true,
          health: 500,
          maxHealth: 500,
          mana: 0,
          maxMana: 0,
          damage: 1_000_000,
          defense: 0,
          dodge: 0,
          criticalChance: 0,
          criticalDamage: 150,
        },
        {
          profileId: 6,
          userId: 8,
          name: 'Ally',
          level: 5,
          leader: false,
          health: 500,
          maxHealth: 500,
          mana: 0,
          maxMana: 0,
          damage: 50,
          defense: 0,
          dodge: 0,
          criticalChance: 0,
          criticalDamage: 150,
        },
      ],
    };
    for (const guardian of run.opponents.filter(({ isBoss }) => !isBoss)) guardian.status = 'DEFEATED';
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    boss.status = 'AVAILABLE';
    run.latestEvents = [{ actor: 'PLAYER', damage: 10, critical: false, dodged: false, actorName: 'Ally' }];
    storedRun!.state = run;
    prisma.dungeonParty.findUnique.mockResolvedValue({
      id: run.id,
      members: [{ gameProfileId: 5 }, { gameProfileId: 6 }],
    });

    const completed = await service.attack(7, run.id, boss.id);
    const totalExperience = Math.round(boss.monster.rewardExperience * (1 + run.experienceBonusPercent / 100));
    const totalGold = Math.round(
      run.opponents.reduce((sum, entry) => sum + entry.monster.rewardGold, 0) * 2 * (1 + run.goldBonusPercent / 100),
    );

    expect(completed.lastExperience).toBe(Math.floor(totalExperience / 2));
    expect(completed.partyRewards?.['5'].gold).toBe(Math.floor(totalGold / 2));
    expect(completed.partyRewards?.['6'].gold).toBe(Math.floor(totalGold / 2));
    expect(completed.partyLoot?.items).toHaveLength(1);
    expect(completed.latestEvents).toHaveLength(2);
    expect(completed.latestEvents[0]).toMatchObject({ actorName: 'Ally', damage: 10 });
    expect(itemGenerator.generate).toHaveBeenCalledTimes(1);
  });

  it('permanently abandons an unfinished run without granting final rewards', async () => {
    const run = await service.enter(7, 'EMBERDEEP');

    await expect(service.leave(7, run.id)).resolves.toEqual({ success: true });
    expect(storedRun).toBeNull();
    expect(itemGenerator.generate).not.toHaveBeenCalled();
    expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
  });

  it('consumes a health potion and persists restored dungeon health', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 10;
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: 71,
      quantity: 2,
      item: { name: 'Minor Health Potion', isConsumable: true },
    });

    await expect(service.useHealthPotion(7, run.id, 71)).resolves.toMatchObject({
      healed: 50,
      run: { player: { health: 60 } },
    });
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 71 },
      data: { quantity: { decrement: 1 } },
    });
    expect(storedRun?.state.player.health).toBe(60);
  });
});
