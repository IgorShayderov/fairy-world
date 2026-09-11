import { Test, TestingModule } from '@nestjs/testing';
import { MonstersService } from './monsters.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MonsterGeneratorService } from './monster-generator.service';
import { UsersService } from '../users/users.service';
import { StatType } from '../../generated/client';

describe('MonstersService', () => {
  let service: MonstersService;

  const mockPrismaService = {
    gameProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    monster: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const mockMonsterGenerator = {
    generate: jest.fn(),
  };
  const mockUsersService = {
    findCurrentUser: jest.fn(),
  };
  const currentUser = (level: number, healthBase?: number) => ({
    id: 7,
    name: 'Hero',
    email: 'hero@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    gameProfile: {
      level,
      gold: 0,
      gems: 0,
      experience: 0,
      freeAttributes: 0,
      inventory: [],
      profileAttributes: [],
      profileStats:
        healthBase === undefined ? [] : [{ value: healthBase, stat: { name: StatType.HEALTH, description: null } }],
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonstersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonsterGeneratorService, useValue: mockMonsterGenerator },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<MonstersService>(MonstersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValue(0.99);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(5));
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

      const battle = await service.attack(7, encounter.battle.id);

      expect(battle.status).toBe('VICTORY');
      expect(battle.events.length).toBeGreaterThan(1);
      expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
        where: { userId: 7 },
        data: { gold: { increment: 7 }, experience: { increment: 11 } },
      });
    });
  });
});
