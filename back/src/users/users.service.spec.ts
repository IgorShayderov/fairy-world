import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    gameProfile: {
      findUnique: jest.fn(),
    },
    inventoryItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation((operation: (client: typeof mockPrismaService) => unknown) =>
      operation(mockPrismaService),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBy', () => {
    it('should return a user by given conditions (e.g., email)', async () => {
      const expectedUser = { id: 1, email: 'john@mail.ru', password: 'hashed_password' };

      mockPrismaService.user.findFirst.mockResolvedValue(expectedUser);

      const user = await service.findBy({ email: 'john@mail.ru' });

      expect(user).toEqual(expectedUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@mail.ru' },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const expectedUser = { id: 1, email: 'john@mail.ru', password: 'hashed_password' };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const user = await service.findById(1);

      expect(user).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findCurrentUser', () => {
    it('loads the game profile and inventory for /me', async () => {
      const expectedUser = { id: 1, gameProfile: { gold: 100, experience: 5, level: 2, inventory: [] } };
      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      await expect(service.findCurrentUser(1)).resolves.toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          gameProfile: {
            include: {
              inventory: {
                include: {
                  item: {
                    include: {
                      attributes: { include: { attribute: true } },
                      stats: { include: { stat: true } },
                    },
                  },
                },
                orderBy: { id: 'asc' },
              },
              profileAttributes: { include: { attribute: true } },
              profileStats: { include: { stat: true } },
            },
          },
        },
      });
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updateData = { resetPasswordToken: 'new_token' };
      const expectedUser = { id: 1, email: 'john@mail.ru', resetPasswordToken: 'new_token' };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const user = await service.update(1, updateData);

      expect(user).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });
  });

  describe('equipment', () => {
    it('splits one item from a backpack stack and equips it persistently', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 9,
          gameProfileId: 4,
          itemId: 2,
          quantity: 3,
          isEquiped: false,
          slot: null,
          item: { equipmentType: ['SHIELD'] },
        })
        .mockResolvedValueOnce(null);

      await expect(service.equipItem(7, { inventoryItemId: 9, slot: 'right-hand' })).resolves.toEqual({
        success: true,
      });
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { quantity: { decrement: 1 } },
      });
      expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledWith({
        data: { gameProfileId: 4, itemId: 2, quantity: 1, isEquiped: true, slot: 'right-hand' },
      });
    });

    it('merges an unequipped item back into its backpack stack', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 10,
          gameProfileId: 4,
          itemId: 2,
          quantity: 1,
          isEquiped: true,
          slot: 'right-hand',
        })
        .mockResolvedValueOnce({ id: 9 });

      await expect(service.unequipItem(7, 'right-hand')).resolves.toEqual({ success: true });
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { quantity: { increment: 1 } },
      });
      expect(mockPrismaService.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });
  });
});
