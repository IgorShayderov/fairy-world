import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { AttributeType } from '../../generated/client';
import { BadRequestException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    gameProfile: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    attribute: {
      findUnique: jest.fn(),
    },
    profileAttribute: {
      upsert: jest.fn(),
    },
    gameProfileBuff: {
      upsert: jest.fn(),
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

  afterEach(() => {
    jest.useRealTimers();
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
              buffs: true,
              dungeonVisits: true,
              sanctuaryVisits: true,
              _count: { select: { quests: { where: { completedAt: { not: null } } } } },
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
    it('blocks shields in the left hand', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 1 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValueOnce({
        item: { level: 1, equipmentType: ['SHIELD'] },
      });
      await expect(service.equipItem(7, { inventoryItemId: 9, slot: 'left-hand' })).rejects.toThrow(
        'cannot be equipped',
      );
      expect(mockPrismaService.inventoryItem.update).not.toHaveBeenCalled();
    });
    it('rejects items more than three levels higher before modifying inventory', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 1 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValueOnce({
        item: { level: 5, equipmentType: ['SHIELD'] },
      });
      await expect(service.equipItem(7, { inventoryItemId: 9, slot: 'right-hand' })).rejects.toThrow(
        'requires player level 2',
      );
      expect(mockPrismaService.inventoryItem.update).not.toHaveBeenCalled();
      expect(mockPrismaService.inventoryItem.create).not.toHaveBeenCalled();
    });
    it('splits one item from a backpack stack and equips it persistently', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 1 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 9,
          gameProfileId: 4,
          itemId: 2,
          quantity: 3,
          isEquiped: false,
          slot: null,
          item: { level: 4, equipmentType: ['SHIELD'] },
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

    it('equips at most five health potions from a backpack stack', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 12,
          gameProfileId: 4,
          itemId: 5,
          quantity: 8,
          isEquiped: false,
          slot: null,
          item: { name: 'Lesser Health Potion', equipmentType: ['POTION'] },
        })
        .mockResolvedValueOnce(null);

      await expect(service.equipItem(7, { inventoryItemId: 12, slot: 'potion' })).resolves.toEqual({
        success: true,
      });
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 12 },
        data: { quantity: { decrement: 5 } },
      });
      expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledWith({
        data: { gameProfileId: 4, itemId: 5, quantity: 5, isEquiped: true, slot: 'potion' },
      });
    });

    it('fills an equipped health-potion stack only to five', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 12,
          gameProfileId: 4,
          itemId: 5,
          quantity: 4,
          isEquiped: false,
          slot: null,
          item: { name: 'Lesser Health Potion', equipmentType: ['POTION'] },
        })
        .mockResolvedValueOnce({
          id: 15,
          gameProfileId: 4,
          itemId: 5,
          quantity: 3,
          isEquiped: true,
          slot: 'potion',
          item: { name: 'Lesser Health Potion', equipmentType: ['POTION'] },
        });

      await service.equipItem(7, { inventoryItemId: 12, slot: 'potion' });

      expect(mockPrismaService.inventoryItem.update).toHaveBeenNthCalledWith(1, {
        where: { id: 15 },
        data: { quantity: { increment: 2 } },
      });
      expect(mockPrismaService.inventoryItem.update).toHaveBeenNthCalledWith(2, {
        where: { id: 12 },
        data: { quantity: { decrement: 2 } },
      });
    });

    it('rejects equipping a non-health potion', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 13,
        gameProfileId: 4,
        itemId: 6,
        quantity: 1,
        isEquiped: false,
        slot: null,
        item: { name: 'Mild Attack Potion', equipmentType: ['POTION'] },
      });

      await expect(service.equipItem(7, { inventoryItemId: 13, slot: 'potion' })).rejects.toThrow(
        'Only health potions can be equipped',
      );
    });
  });

  describe('potion consumption', () => {
    it('consumes one potion and persists its four-hour buff', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-12T08:00:00Z'));
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 14,
        gameProfileId: 4,
        quantity: 2,
        isEquiped: false,
        item: { name: 'Mild Attack Potion', isConsumable: true },
      });
      mockPrismaService.gameProfileBuff.upsert.mockResolvedValue({
        type: 'DAMAGE',
        value: 15,
        expiresAt: new Date('2026-09-12T12:00:00Z'),
      });

      await service.consumeInventoryItem(7, 14);

      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 14 },
        data: { quantity: { decrement: 1 } },
      });
      expect(mockPrismaService.gameProfileBuff.upsert).toHaveBeenCalledWith({
        where: { gameProfileId_type: { gameProfileId: 4, type: 'DAMAGE' } },
        create: {
          gameProfileId: 4,
          type: 'DAMAGE',
          value: 15,
          expiresAt: new Date('2026-09-12T12:00:00Z'),
        },
        update: { value: 15, expiresAt: new Date('2026-09-12T12:00:00Z') },
      });
    });

    it('does not consume health potions from the backpack', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 16,
        gameProfileId: 4,
        quantity: 2,
        isEquiped: false,
        item: { name: 'Lesser Health Potion', isConsumable: true },
      });

      await expect(service.consumeInventoryItem(7, 16)).rejects.toThrow('Health potions must be equipped');
      expect(mockPrismaService.inventoryItem.update).not.toHaveBeenCalled();
      expect(mockPrismaService.inventoryItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('map position', () => {
    it('persists the current coordinates on the game profile', async () => {
      mockPrismaService.gameProfile.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.updateMapPosition(7, { x: 1550.25, y: 980.5 })).resolves.toEqual({
        x: 1550.25,
        y: 980.5,
      });
      expect(mockPrismaService.gameProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: 7 },
        data: { mapPositionX: 1550.25, mapPositionY: 980.5 },
      });
    });

    it('rejects saving a position for a missing game profile', async () => {
      mockPrismaService.gameProfile.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.updateMapPosition(7, { x: 1550, y: 980 })).rejects.toThrow('Game profile not found');
    });
  });

  describe('attribute allocation', () => {
    it('atomically spends free points and increases an existing attribute', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.attribute.findUnique.mockResolvedValue({ id: 2, name: AttributeType.STRENGTH });
      mockPrismaService.gameProfile.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.profileAttribute.upsert.mockResolvedValue({ value: 7 });

      await expect(service.allocateAttribute(7, { attribute: AttributeType.STRENGTH, amount: 2 })).resolves.toEqual({
        success: true,
        attribute: AttributeType.STRENGTH,
        value: 7,
      });
      expect(mockPrismaService.gameProfile.updateMany).toHaveBeenCalledWith({
        where: { id: 4, freeAttributes: { gte: 2 } },
        data: { freeAttributes: { decrement: 2 } },
      });
      expect(mockPrismaService.profileAttribute.upsert).toHaveBeenCalledWith({
        where: { gameProfileId_attributeId: { gameProfileId: 4, attributeId: 2 } },
        create: { gameProfileId: 4, attributeId: 2, value: 7 },
        update: { value: { increment: 2 } },
        select: { value: true },
      });
    });

    it('does not increase an attribute when there are not enough free points', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.attribute.findUnique.mockResolvedValue({ id: 2, name: AttributeType.AGILITY });
      mockPrismaService.gameProfile.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.allocateAttribute(7, { attribute: AttributeType.AGILITY, amount: 1 })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.profileAttribute.upsert).not.toHaveBeenCalled();
    });
  });
});
