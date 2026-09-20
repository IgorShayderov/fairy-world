import { Test, TestingModule } from '@nestjs/testing';
import { MonstersService, damageAfterDefense, rollDeathCurse, DEATH_CURSES } from './monsters.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MonsterGeneratorService } from './monster-generator.service';
import { UsersService } from '../users/users.service';
import { PlayerBuffType, StatType } from '../../generated/client';
import { ItemGeneratorService } from '../items/item-generator.service';

describe('MonstersService', () => {
  let service: MonstersService;

  const mockPrismaService = {
    playerQuest: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    gameProfileBuff: { deleteMany: jest.fn(), create: jest.fn() },
    $executeRaw: jest.fn(),
    dungeonVisit: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
    gameProfile: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    monster: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    inventoryItem: {
      create: jest.fn().mockResolvedValue({ id: 99 }),
      count: jest.fn().mockResolvedValue(0),
    },
    craftItem: { findUnique: jest.fn() },
    playerCraftItem: { upsert: jest.fn() },
  };
  const mockMonsterGenerator = {
    generate: jest.fn(),
  };
  const mockUsersService = {
    findCurrentUser: jest.fn(),
  };
  const mockItemGenerator = {
    generate: jest.fn(),
  };
  const currentUser = (
    level: number,
    healthBase?: number,
    buffs: Array<{ type: PlayerBuffType; value: number; expiresAt: Date }> = [],
  ) => ({
    id: 7,
    name: 'Hero',
    email: 'hero@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    gameProfile: {
      level,
      id: 5,
      gold: 0,
      gems: 0,
      experience: 0,
      freeAttributes: 0,
      buffs,
      mapPositionX: 1470,
      mapPositionY: 1040,
      inventory: [],
      profileAttributes: [],
      profileStats:
        healthBase === undefined ? [] : [{ value: healthBase, stat: { name: StatType.HEALTH, description: null } }],
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockPrismaService.playerQuest.findMany.mockResolvedValue([]);
    mockPrismaService.playerQuest.updateMany.mockResolvedValue({ count: 1 });
    mockPrismaService.dungeonVisit.findUnique.mockResolvedValue(null);
    mockPrismaService.$transaction.mockImplementation((operation: (client: typeof mockPrismaService) => unknown) =>
      operation(mockPrismaService),
    );
    mockPrismaService.gameProfile.update.mockResolvedValue({ id: 5, level: 1, experience: 14 });
    mockPrismaService.craftItem.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonstersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonsterGeneratorService, useValue: mockMonsterGenerator },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ItemGeneratorService, useValue: mockItemGenerator },
      ],
    }).compile();

    service = module.get<MonstersService>(MonstersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('respawns in Evercross and clears all buffs on defeat without awarding a kill', async () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.99);
    mockUsersService.findCurrentUser.mockResolvedValue(currentUser(1));
    mockMonsterGenerator.generate.mockReturnValue({
      id: 2,
      name: 'Dire Wolf',
      monsterType: 'Dire Wolf',
      level: 1,
      attributes: [],
      rewardGold: 7,
      rewardExperience: 11,
    });
    const result = await service.rollEncounter(7);
    if (!result.encountered) throw new Error('Expected battle');
    result.battle.player.health = 1;
    result.battle.player.damage = 1;
    const battle = await service.attack(7, result.battle.id);
    expect(battle.status).toBe('DEFEAT');
    expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
      where: { userId: 7 },
      data: { mapPositionX: 1470, mapPositionY: 1040 },
    });
    expect(mockPrismaService.gameProfileBuff.deleteMany).toHaveBeenCalledWith({ where: { gameProfileId: 5 } });
    expect(mockPrismaService.gameProfileBuff.create).not.toHaveBeenCalled();
    expect(mockPrismaService.playerQuest.findMany).not.toHaveBeenCalled();
    expect(mockPrismaService.gameProfile.update).toHaveBeenCalledTimes(1);
  });

  it('rolls a death curse only for levels above 10 and with 20% probability', () => {
    expect(rollDeathCurse(10, () => 0.1)).toBeNull();
    expect(rollDeathCurse(11, () => 0.25)).toBeNull();
    const curse = rollDeathCurse(11, () => 0.1);
    expect(curse).not.toBeNull();
    expect(DEATH_CURSES).toContainEqual(curse);
    expect(curse!.value).toBeLessThan(0);
  });

  it('applies a curse on defeat when player level is above 10 and roll succeeds', async () => {
    mockPrismaService.gameProfile.update.mockResolvedValue({ id: 5, level: 15 });
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    mockUsersService.findCurrentUser.mockResolvedValue(currentUser(15, 1));
    mockMonsterGenerator.generate.mockReturnValue({
      id: 99,
      name: 'Dragon',
      monsterType: 'Dragon',
      level: 15,
      attributes: [],
      rewardGold: 50,
      rewardExperience: 50,
    });
    const result = await service.rollEncounter(7);
    if (!result.encountered) throw new Error('Expected battle');
    result.battle.player.health = 1;
    result.battle.player.damage = 1;
    await service.attack(7, result.battle.id);
    expect(mockPrismaService.gameProfileBuff.create).toHaveBeenCalledTimes(1);
    const callArgs = mockPrismaService.gameProfileBuff.create.mock.calls[0] as [
      { data: { gameProfileId: number; value: number; expiresAt: Date } },
    ];
    expect(callArgs[0].data.gameProfileId).toBe(5);
    expect(callArgs[0].data.value).toBeLessThan(0);
    expect(callArgs[0].data.expiresAt).toBeInstanceOf(Date);
  });

  it('grants quest gold, XP and Magic-or-better loot once, including XP in level-up calculation', async () => {
    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.1)
      .mockReturnValue(0.95);
    mockUsersService.findCurrentUser.mockResolvedValue(currentUser(1));
    mockMonsterGenerator.generate.mockReturnValue({
      id: 2,
      name: 'Dire Wolf',
      monsterType: 'Dire Wolf',
      level: 1,
      attributes: [],
      rewardGold: 7,
      rewardExperience: 11,
    });
    mockPrismaService.playerQuest.findMany.mockResolvedValue([
      { questId: 1, progress: 19, quest: { target: 20, rewardGold: 200, rewardExperience: 400 } },
    ]);
    mockItemGenerator.generate.mockResolvedValue({
      id: 99,
      name: 'Quest sword',
      description: '',
      price: 1,
      icon: '',
      equipmentType: ['WEAPON'],
      rarity: 'MAGIC',
      level: 1,
      attributes: [],
      stats: [],
    });
    const result = await service.rollEncounter(7);
    if (!result.encountered) throw new Error('Expected battle');
    result.battle.player.damage = 10000;
    const battle = await service.attack(7, result.battle.id);
    expect(battle.rewards).toMatchObject({ gold: 207, experience: 411, items: [{ id: 99, rarity: 'MAGIC' }] });
    expect(mockItemGenerator.generate).toHaveBeenCalledWith(
      { level: 1, rarity: 'MAGIC', minimumRarity: 'MAGIC' },
      mockPrismaService,
    );
    expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { level: 2, experience: 0, freeAttributes: { increment: 5 } },
    });
    await expect(service.attack(7, result.battle.id)).rejects.toThrow('Active battle not found');
    expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledTimes(1);
  });

  it('starts a guaranteed guardian battle at a dungeon and reuses it on repeated entry', async () => {
    const user = currentUser(5);
    mockUsersService.findCurrentUser.mockResolvedValue({
      ...user,
      gameProfile: { ...user.gameProfile, mapPositionX: 2470, mapPositionY: 1370 },
    });
    mockMonsterGenerator.generate.mockReturnValue({
      id: 8,
      name: 'Bandit',
      level: 7,
      rewardGold: 20,
      rewardExperience: 30,
      attributes: [],
    });
    const battle = await service.enterDungeon(7, 'EMBERDEEP');
    expect(battle.status).toBe('ACTIVE');
    expect(battle.monster.name).toContain('Flamebound Guardian');
    expect(mockMonsterGenerator.generate).toHaveBeenCalledWith(7);
    expect((await service.enterDungeon(7, 'EMBERDEEP')).id).toBe(battle.id);
    expect(mockMonsterGenerator.generate).toHaveBeenCalledTimes(1);
    expect(battle.monster.health).toBe(290);
    expect(battle.monster.damage).toBe(26);
    expect(battle.monster.rewardGold).toBe(60);
    expect(battle.monster.rewardExperience).toBe(90);
    expect(mockPrismaService.dungeonVisit.upsert).toHaveBeenCalledTimes(1);
    service.retreat(7, battle.id);
    mockPrismaService.dungeonVisit.findUnique.mockResolvedValue({ nextEntryAt: new Date(Date.now() + 3_600_000) });
    await expect(service.enterDungeon(7, 'EMBERDEEP')).rejects.toThrow('once per hour');
    expect(mockMonsterGenerator.generate).toHaveBeenCalledTimes(1);
    mockPrismaService.dungeonVisit.findUnique.mockResolvedValue({ nextEntryAt: new Date(Date.now() - 1) });
    await expect(service.enterDungeon(7, 'EMBERDEEP')).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(mockPrismaService.dungeonVisit.upsert).toHaveBeenCalledTimes(2);
  });

  it('rejects dungeon entry while the player is elsewhere', async () => {
    const user = currentUser(5);
    mockUsersService.findCurrentUser.mockResolvedValue({
      ...user,
      gameProfile: { ...user.gameProfile, mapPositionX: 1470, mapPositionY: 1040 },
    });
    await expect(service.enterDungeon(7, 'EMBERDEEP')).rejects.toThrow('Travel to this landmark first');
    expect(mockMonsterGenerator.generate).not.toHaveBeenCalled();
  });

  it('charges ten gems to reset an active dungeon cooldown', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 5, mapPositionX: 2470, mapPositionY: 1370 });
    mockPrismaService.dungeonVisit.findUnique.mockResolvedValue({ nextEntryAt: new Date(Date.now() + 60000) });
    mockPrismaService.gameProfile.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.resetDungeon(7, 'EMBERDEEP')).resolves.toEqual({ success: true, cost: 10 });
    expect(mockPrismaService.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 5, gems: { gte: 10 } },
      data: { gems: { decrement: 10 } },
    });
    expect(mockPrismaService.dungeonVisit.delete).toHaveBeenCalledTimes(1);
  });

  it('does not reset cooldown when gems are insufficient', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 5, mapPositionX: 2470, mapPositionY: 1370 });
    mockPrismaService.dungeonVisit.findUnique.mockResolvedValue({ nextEntryAt: new Date(Date.now() + 60000) });
    mockPrismaService.gameProfile.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.resetDungeon(7, 'EMBERDEEP')).rejects.toThrow('Not enough gems');
    expect(mockPrismaService.dungeonVisit.delete).not.toHaveBeenCalled();
  });

  describe('findAll', () => {
    it('should return all monsters ordered by id', async () => {
      const monsters = [{ id: 1, name: 'Goblin', level: 1 }];
      mockPrismaService.monster.findMany.mockResolvedValue(monsters);

      const result = await service.findAll();

      expect(mockPrismaService.monster.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
      expect(result).toEqual(monsters);
    });
  });

  describe('findOne', () => {
    it('should return a monster when found', async () => {
      const monster = { id: 1, name: 'Goblin', level: 1 };
      mockPrismaService.monster.findUnique.mockResolvedValue(monster);

      const result = await service.findOne(1);

      expect(mockPrismaService.monster.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(monster);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.monster.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rollEncounter', () => {
    it('uses ten percent on a route and does not generate a monster when the roll misses', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.2);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(1));

      await expect(service.rollEncounter(7)).resolves.toEqual({ encountered: false, chance: 0.1 });
      expect(mockMonsterGenerator.generate).not.toHaveBeenCalled();
    });

    it('keeps twenty percent encounter chance away from routes', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.15);
      const user = currentUser(1);
      user.gameProfile.mapPositionX = 1000;
      user.gameProfile.mapPositionY = 1000;
      mockUsersService.findCurrentUser.mockResolvedValue(user);
      mockMonsterGenerator.generate.mockReturnValue({ id: 2, name: 'Wolf', level: 1, attributes: [] });
      const result = await service.rollEncounter(7);
      expect(result.encountered).toBe(true);
      expect(result.chance).toBe(0.2);
    });

    it('returns a generated level-appropriate monster when the roll succeeds', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(100, 2_000));
      const monster = {
        id: 2,
        name: 'Savage Bandit',
        description: 'A generated bandit.',
        level: 4,
        rewardGold: 18,
        rewardExperience: 30,
        attributes: [],
      };
      mockMonsterGenerator.generate.mockReturnValue(monster);

      const result = await service.rollEncounter(7);
      expect(result.encountered).toBe(true);
      if (!result.encountered) throw new Error('Expected encounter');
      expect(mockMonsterGenerator.generate).toHaveBeenCalledWith(100, { x: 1470, y: 1040 });
      expect(result.monster).toBe(monster);
      expect(typeof result.battle.id).toBe('string');
      expect(result.battle.status).toBe('ACTIVE');
      expect(result.battle.player).toMatchObject({
        name: 'Hero',
        health: 3_065,
        maxHealth: 3_065,
        damage: 6,
        defense: 5,
        dodge: 1.5,
        criticalChance: 1.5,
        criticalDamage: 166.7,
      });
      expect(result.battle.monster.id).toBe(2);
      expect(result.battle.monster.health).toBeGreaterThan(0);
    });

    it('resolves the entire battle with one attack and permanently awards victory rewards', async () => {
      mockPrismaService.gameProfile.update.mockResolvedValueOnce({ id: 5, level: 5, experience: 2500 });
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.01)
        .mockReturnValueOnce(0.99)
        .mockReturnValueOnce(0.99)
        .mockReturnValue(0.1);
      mockUsersService.findCurrentUser.mockResolvedValue(
        currentUser(5, undefined, [
          { type: PlayerBuffType.EXPERIENCE, value: 25, expiresAt: new Date('2099-01-01T00:00:00Z') },
        ]),
      );
      mockMonsterGenerator.generate.mockReturnValue({
        id: 2,
        name: 'Wandering Rat',
        description: 'A generated rat.',
        level: 1,
        rewardGold: 7,
        rewardExperience: 11,
        attributes: [],
      });
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');
      encounter.battle.player.damage = 1_000;

      const battle = await service.attack(7, encounter.battle.id);

      expect(battle.status).toBe('VICTORY');
      expect(battle.events.length).toBeGreaterThan(0);
      expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
        where: { userId: 7 },
        data: { gold: { increment: 7 }, experience: { increment: 14 }, killedMonsters: { increment: 1 } },
        select: { id: true, level: true, experience: true },
      });
      expect(battle.rewards?.items).toEqual([]);
      expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { level: 6, experience: 0, freeAttributes: { increment: 5 } },
      });
    });

    it('adds a generated rarity-weighted item drop to inventory on victory', async () => {
      const random = jest.spyOn(Math, 'random');
      random.mockReturnValueOnce(0.01).mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0.97);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(5));
      mockMonsterGenerator.generate.mockReturnValue({
        id: 2,
        name: 'Wandering Rat',
        description: 'A generated rat.',
        level: 4,
        rewardGold: 7,
        rewardExperience: 11,
        attributes: [],
      });
      const droppedItem = {
        id: 44,
        name: 'Lucky Ring',
        description: 'MAGIC level 4 ring.',
        price: 100,
        icon: 'icon_ring.png',
        isConsumable: false,
        rarity: 'MAGIC' as const,
        equipmentType: ['RING' as const],
        level: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        attributes: [],
        stats: [],
      };
      mockItemGenerator.generate.mockResolvedValue(droppedItem);
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');
      encounter.battle.player.damage = 1_000;

      const battle = await service.attack(7, encounter.battle.id);

      expect(mockItemGenerator.generate).toHaveBeenCalledWith({ level: 4, rarity: 'MAGIC' }, mockPrismaService);
      expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledWith({
        data: { gameProfileId: 5, itemId: 44, quantity: 1, slot: null, isEquiped: false },
      });
      expect(battle.rewards?.items).toEqual([
        expect.objectContaining({ id: 44, name: 'Lucky Ring', rarity: 'MAGIC', quantity: 1 }),
      ]);
    });

    it('marks drop as inventoryFull and does not insert into inventory when backpack is at 24 slots', async () => {
      mockPrismaService.inventoryItem.count.mockResolvedValue(24);
      const random = jest.spyOn(Math, 'random');
      random.mockReturnValueOnce(0.01).mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValue(0.95);
      const droppedItem = {
        id: 44,
        name: 'Lucky Ring',
        description: 'Magic ring',
        price: 100,
        icon: 'icon_ring.png',
        isConsumable: false,
        rarity: 'MAGIC' as const,
        equipmentType: ['RING' as const],
        level: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        attributes: [],
        stats: [],
      };
      mockItemGenerator.generate.mockResolvedValue(droppedItem);
      mockMonsterGenerator.generate.mockReturnValue({
        id: 99,
        name: 'Spider',
        monsterType: 'Spider',
        level: 1,
        attributes: [],
        rewardGold: 7,
        rewardExperience: 11,
      });
      const result = await service.rollEncounter(7);
      if (!result.encountered) throw new Error('Expected battle');
      result.battle.player.damage = 1_000;
      mockPrismaService.inventoryItem.create.mockClear();

      const battle = await service.attack(7, result.battle.id);
      expect(battle.status).toBe('VICTORY');
      expect(battle.rewards?.items.length).toBeGreaterThan(0);
      expect(battle.rewards?.items[0].inventoryFull).toBe(true);
      expect(mockPrismaService.inventoryItem.create).not.toHaveBeenCalled();
    });
  });
});

describe('damageAfterDefense', () => {
  it('subtracts defense as flat damage-blocking points', () => {
    expect(damageAfterDefense(25, 7)).toBe(18);
  });

  it('always leaves at least one point of damage', () => {
    expect(damageAfterDefense(10, 50)).toBe(1);
  });
});
