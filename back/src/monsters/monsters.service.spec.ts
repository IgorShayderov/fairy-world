import { Test, TestingModule } from '@nestjs/testing';
import { MonstersService } from './monsters.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('MonstersService', () => {
  let service: MonstersService;

  const mockPrismaService = {
    monster: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
});
