import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from './locations.service';
import { PrismaService } from '../prisma.service';

describe('LocationsService', () => {
  let service: LocationsService;

  const mockPrismaService = {
    location: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    usersLocation: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all locations ordered by id', async () => {
      const locations = [{ id: 1, name: 'Town', variant: 'CITY', eventType: 'NONE' }];
      mockPrismaService.location.findMany.mockResolvedValue(locations);

      const result = await service.findAll();

      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
      expect(result).toEqual(locations);
    });
  });

  describe('getUserLocation', () => {
    it('should return the user location with the location relation', async () => {
      const entry = { userId: 7, locationId: 1, location: { id: 1, name: 'Town' } };
      mockPrismaService.usersLocation.findUnique.mockResolvedValue(entry);

      const result = await service.getUserLocation(7);

      expect(mockPrismaService.usersLocation.findUnique).toHaveBeenCalledWith({
        where: { userId: 7 },
        include: { location: true },
      });
      expect(result).toEqual(entry);
    });
  });

  describe('setUserLocation', () => {
    it('should upsert the user location', async () => {
      const location = { id: 1, name: 'Town' };
      const upserted = { userId: 7, locationId: 1, location };
      mockPrismaService.location.findUnique.mockResolvedValue(location);
      mockPrismaService.usersLocation.upsert.mockResolvedValue(upserted);

      const result = await service.setUserLocation(7, 1);

      expect(mockPrismaService.usersLocation.upsert).toHaveBeenCalledWith({
        where: { userId: 7 },
        update: { locationId: 1 },
        create: { userId: 7, locationId: 1 },
        include: { location: true },
      });
      expect(result).toEqual(upserted);
    });

    it('should throw when the location does not exist', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(null);

      await expect(service.setUserLocation(7, 999)).rejects.toThrow('Location not found');
    });
  });
});
