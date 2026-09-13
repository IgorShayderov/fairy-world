import { Test, TestingModule } from '@nestjs/testing';
import { MonstersService } from './monsters.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MonsterGeneratorService } from './monster-generator.service';
import { UsersService } from '../users/users.service';
import { PlayerBuffType, StatType } from '../../generated/client';
import { ItemGeneratorService } from '../items/item-generator.service';

describe('MonstersService', () => {
  let service: MonstersService;

  const mockPrismaService = {
    $executeRaw: jest.fn(),
    dungeonVisit: { findUnique: jest.fn(), upsert: jest.fn() },
    $transaction: jest.fn(),
    gameProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    monster: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    inventoryItem: {
      create: jest.fn(),
    },
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
      inventory: [],
      profileAttributes: [],
      profileStats:
        healthBase === undefined ? [] : [{ value: healthBase, stat: { name: StatType.HEALTH, description: null } }],
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockPrismaService.dungeonVisit.findUnique.mockResolvedValue(null);
    mockPrismaService.$transaction.mockImplementation((operation: (client: typeof mockPrismaService) => unknown) =>
      operation(mockPrismaService),
    );
    mockPrismaService.gameProfile.update.mockResolvedValue({ id: 5, level: 1, experience: 14 });

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
    it('does not query monsters when the fifty-percent roll misses', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await expect(service.rollEncounter(7)).resolves.toEqual({ encountered: false, chance: 0.5 });
      expect(mockUsersService.findCurrentUser).not.toHaveBeenCalled();
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
      expect(mockMonsterGenerator.generate).toHaveBeenCalledWith(100);
      expect(result.monster).toBe(monster);
      expect(typeof result.battle.id).toBe('string');
      expect(result.battle.status).toBe('ACTIVE');
      expect(result.battle.player).toMatchObject({
        name: 'Hero',
        health: 2_050,
        maxHealth: 2_050,
        damage: 6,
        defense: 0.5,
        dodge: 1.3,
        criticalChance: 1.3,
        criticalDamage: 135.6,
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
        data: { gold: { increment: 7 }, experience: { increment: 14 } },
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
      random.mockReturnValueOnce(0.01).mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0.9);
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
  });
});
