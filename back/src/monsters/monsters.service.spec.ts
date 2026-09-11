import { Test, TestingModule } from '@nestjs/testing';
import { MonstersService } from './monsters.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

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

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MonstersService, { provide: PrismaService, useValue: mockPrismaService }],
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
    it('does not query monsters when the five-percent roll misses', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await expect(service.rollEncounter(7)).resolves.toEqual({ encountered: false, chance: 0.05 });
      expect(mockPrismaService.monster.findMany).not.toHaveBeenCalled();
    });

    it('returns a level-appropriate monster when the roll succeeds', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValueOnce(0);
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ level: 5 });
      const monsters = [
        { id: 1, name: 'Goblin', level: 1, attributes: [] },
        { id: 2, name: 'Bandit', level: 4, attributes: [] },
        { id: 3, name: 'Bat', level: 5, attributes: [] },
      ];
      mockPrismaService.monster.findMany.mockResolvedValue(monsters);

      const result = await service.rollEncounter(7);
      expect(result.encountered).toBe(true);
      if (!result.encountered) throw new Error('Expected encounter');
      expect(result.monster).toBe(monsters[1]);
      expect(typeof result.battle.id).toBe('string');
      expect(result.battle.status).toBe('ACTIVE');
      expect(result.battle.player.health).toBeGreaterThan(0);
      expect(result.battle.monster.id).toBe(2);
      expect(result.battle.monster.health).toBeGreaterThan(0);
    });

    it('runs attack turns and permanently awards victory rewards', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValueOnce(0).mockReturnValue(0.99);
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ level: 5 });
      mockPrismaService.monster.findMany.mockResolvedValue([
        {
          id: 2,
          name: 'Rat',
          level: 1,
          rewardGold: 7,
          rewardExperience: 11,
          attributes: [],
        },
      ]);
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');

      let battle = encounter.battle;
      while (battle.status === 'ACTIVE') battle = await service.attack(7, battle.id);

      expect(battle.status).toBe('VICTORY');
      expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
        where: { userId: 7 },
        data: { gold: { increment: 7 }, experience: { increment: 11 } },
      });
    });
  });
});
