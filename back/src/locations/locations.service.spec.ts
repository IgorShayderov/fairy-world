import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from './locations.service';
import { PrismaService } from '../prisma.service';

describe('LocationsService', () => {
  let service: LocationsService;

  const mockPrismaService = {
    $executeRaw: jest.fn(),
    sanctuary: { findUnique: jest.fn() },
    sanctuaryVisit: { findUnique: jest.fn(), upsert: jest.fn() },
    $transaction: jest.fn(),
    gameProfile: { findUnique: jest.fn() },
    gameProfileBuff: { findUnique: jest.fn(), upsert: jest.fn() },
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
    mockPrismaService.sanctuaryVisit.findUnique.mockResolvedValue(null);
    mockPrismaService.gameProfileBuff.findUnique.mockResolvedValue(null);
    mockPrismaService.sanctuary.findUnique.mockResolvedValue({
      id: 1,
      x: 720,
      y: 1480,
      buffType: 'DEFENSE',
      buffValue: 10,
      durationMinutes: 240,
    });
    mockPrismaService.$transaction.mockImplementation((operation: (tx: typeof mockPrismaService) => unknown) =>
      operation(mockPrismaService),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('grants the northern sanctuary attack blessing from its database definition', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 1200, mapPositionY: 330 });
    mockPrismaService.sanctuary.findUnique.mockResolvedValue({
      id: 3,
      x: 1200,
      y: 330,
      buffType: 'DAMAGE',
      buffValue: 5,
      durationMinutes: 240,
    });
    await service.bless(7, 3, { x: 1200, y: 330 });
    expect(mockPrismaService.gameProfileBuff.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { gameProfileId: 4, type: 'DAMAGE', value: 5, expiresAt: expect.any(Date) as Date },
      }),
    );
  });

  it('rejects unknown sanctuary ids and forged coordinates', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 720, mapPositionY: 1480 });
    await expect(service.bless(7, 1, { x: 0, y: 0 })).rejects.toThrow('Travel to this landmark first');
    mockPrismaService.sanctuary.findUnique.mockResolvedValue(null);
    await expect(service.bless(7, 999, { x: 720, y: 1480 })).rejects.toThrow('Sanctuary not found');
    expect(mockPrismaService.gameProfileBuff.upsert).not.toHaveBeenCalled();
  });

  it('uses Dawnshrine experience bonuses defined by the database', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 2240, mapPositionY: 1540 });
    mockPrismaService.sanctuary.findUnique.mockResolvedValue({
      id: 2,
      x: 2240,
      y: 1540,
      buffType: 'EXPERIENCE',
      buffValue: 20,
      durationMinutes: 240,
    });
    await service.bless(7, 2, { x: 2240, y: 1540 });
    const calls = mockPrismaService.gameProfileBuff.upsert.mock.calls as [
      { create: { type: string; value: number } },
    ][];
    expect(calls[0][0].create).toMatchObject({ type: 'EXPERIENCE', value: 20 });
  });

  it('grants a four-hour blessing at a sanctuary', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 720, mapPositionY: 1480 });
    mockPrismaService.gameProfileBuff.findUnique.mockResolvedValue(null);
    const before = Date.now();
    await service.bless(7, 1, { x: 720, y: 1480 });
    const calls = mockPrismaService.gameProfileBuff.upsert.mock.calls as [
      {
        create: { gameProfileId: number; type: string; value: number; expiresAt: Date };
      },
    ][];
    const args = calls[0][0];
    expect(args.create).toMatchObject({ gameProfileId: 4, type: 'DEFENSE', value: 10 });
    expect(args.create.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 4 * 60 * 60 * 1000);
  });

  it('preserves an active defense potion', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 720, mapPositionY: 1480 });
    const buff = { value: 50, expiresAt: new Date(Date.now() + 60_000) };
    mockPrismaService.gameProfileBuff.findUnique.mockResolvedValue(buff);
    await expect(service.bless(7, 1, { x: 720, y: 1480 })).resolves.toBe(buff);
    expect(mockPrismaService.gameProfileBuff.upsert).not.toHaveBeenCalled();
  });

  it('rejects another blessing during cooldown even if the original buff is gone', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 720, mapPositionY: 1480 });
    mockPrismaService.sanctuaryVisit.findUnique.mockResolvedValue({ nextBlessingAt: new Date(Date.now() + 60_000) });
    await expect(service.bless(7, 1, { x: 720, y: 1480 })).rejects.toThrow('only once every four hours');
    expect(mockPrismaService.gameProfileBuff.upsert).not.toHaveBeenCalled();
  });

  it('allows a blessing after the saved cooldown expires and saves a new four-hour cooldown', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 720, mapPositionY: 1480 });
    mockPrismaService.sanctuaryVisit.findUnique.mockResolvedValue({ nextBlessingAt: new Date(Date.now() - 1) });
    const before = Date.now();
    await service.bless(7, 1, { x: 720, y: 1480 });
    expect(mockPrismaService.gameProfileBuff.upsert).toHaveBeenCalledTimes(1);
    const calls = mockPrismaService.sanctuaryVisit.upsert.mock.calls as [{ create: { nextBlessingAt: Date } }][];
    expect(calls[0][0].create.nextBlessingAt.getTime()).toBeGreaterThanOrEqual(before + 4 * 60 * 60 * 1000);
  });

  it('rejects a blessing from a distant landmark', async () => {
    mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, mapPositionX: 1470, mapPositionY: 1040 });
    await expect(service.bless(7, 1, { x: 720, y: 1480 })).rejects.toThrow('Travel to this landmark first');
    expect(mockPrismaService.gameProfileBuff.upsert).not.toHaveBeenCalled();
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
