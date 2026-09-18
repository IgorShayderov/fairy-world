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
      findMany: jest.fn(),
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
      count: jest.fn().mockResolvedValue(0),
    },
    item: {
      findUnique: jest.fn(),
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

    it('rejects equipping a two-handed sword in the right hand', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 1 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValueOnce({
        id: 20,
        gameProfileId: 4,
        itemId: 10,
        quantity: 1,
        isEquiped: false,
        slot: null,
        item: { name: 'Two-handed Sword', level: 1, equipmentType: ['WEAPON'] },
      });

      await expect(service.equipItem(7, { inventoryItemId: 20, slot: 'right-hand' })).rejects.toThrow(
        'Two-handed weapons must be equipped in the left hand',
      );
    });

    it('unequips the right-hand item when a two-handed sword is equipped in the left hand', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 1 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 20,
          gameProfileId: 4,
          itemId: 10,
          quantity: 1,
          isEquiped: false,
          slot: null,
          item: { name: 'Two-handed Sword', level: 1, equipmentType: ['WEAPON'] },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 25, itemId: 3, quantity: 1 })
        .mockResolvedValueOnce(null);

      await expect(service.equipItem(7, { inventoryItemId: 20, slot: 'left-hand' })).resolves.toEqual({
        success: true,
      });

      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 25 },
        data: { isEquiped: false, slot: null },
      });
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { quantity: 1, isEquiped: true, slot: 'left-hand' },
      });
    });

    it('unequips a two-handed sword in the left hand when an item is equipped in the right hand', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 1 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 30,
          gameProfileId: 4,
          itemId: 5,
          quantity: 1,
          isEquiped: false,
          slot: null,
          item: { name: 'Iron Shield', level: 1, equipmentType: ['SHIELD'] },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 20,
          itemId: 10,
          quantity: 1,
          item: { name: 'Two-handed Sword' },
        })
        .mockResolvedValueOnce(null);

      await expect(service.equipItem(7, { inventoryItemId: 30, slot: 'right-hand' })).resolves.toEqual({
        success: true,
      });

      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { isEquiped: false, slot: null },
      });
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 30 },
        data: { quantity: 1, isEquiped: true, slot: 'right-hand' },
      });
    });
  });

  describe('potion consumption', () => {
    it('consumes one potion and persists its four-hour buff', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-12T08:00:00Z'));
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 30 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 14,
        gameProfileId: 4,
        quantity: 2,
        isEquiped: false,
        item: { name: 'Mild Attack Potion', isConsumable: true },
      });
      mockPrismaService.gameProfileBuff.upsert.mockResolvedValue({
        type: 'DAMAGE',
        value: 20,
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
          value: 20,
          expiresAt: new Date('2026-09-12T12:00:00Z'),
        },
        update: { value: 20, expiresAt: new Date('2026-09-12T12:00:00Z') },
      });
    });

    it('rejects consuming a potion when player level is below required level', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 5 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 14,
        gameProfileId: 4,
        quantity: 1,
        isEquiped: false,
        item: { name: 'Lesser Attack Potion', isConsumable: true },
      });

      await expect(service.consumeInventoryItem(7, 14)).rejects.toThrow('This potion requires player level 10');
      expect(mockPrismaService.inventoryItem.update).not.toHaveBeenCalled();
    });

    it('does not consume health potions from the backpack', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4, level: 10 });
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

  describe('getLeaderboard', () => {
    it('returns ranked players ordered by level, monsters killed, and quests completed', async () => {
      const profiles = [
        {
          id: 1,
          level: 25,
          killedMonsters: 100,
          user: { name: 'DragonSlayer' },
          _count: { quests: 12 },
        },
        {
          id: 2,
          level: 20,
          killedMonsters: 80,
          user: { name: 'Mage' },
          _count: { quests: 8 },
        },
      ];
      mockPrismaService.gameProfile.findMany.mockResolvedValue(profiles);

      const result = await service.getLeaderboard(10);
      expect(result).toEqual([
        { rank: 1, name: 'DragonSlayer', level: 25, killedMonsters: 100, questsCompleted: 12 },
        { rank: 2, name: 'Mage', level: 20, killedMonsters: 80, questsCompleted: 8 },
      ]);
      expect(mockPrismaService.gameProfile.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: [{ level: 'desc' }, { killedMonsters: 'desc' }, { experience: 'desc' }],
        include: {
          user: { select: { name: true } },
          _count: { select: { quests: { where: { completedAt: { not: null } } } } },
        },
      });
    });
  });

  describe('inventory slots limit and management', () => {
    it('rejects unequipping when backpack is full at 24 items', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({ id: 10, itemId: 2, quantity: 1, isEquiped: true, slot: 'head' })
        .mockResolvedValueOnce(null);
      mockPrismaService.inventoryItem.count.mockResolvedValue(24);

      await expect(service.unequipItem(7, 'head')).rejects.toThrow('Inventory is full');
    });

    it('drops an inventory item by deleting it', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue({ id: 15, gameProfileId: 4 });

      await expect(service.dropInventoryItem(7, 15)).resolves.toEqual({ success: true });
      expect(mockPrismaService.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 15 } });
    });

    it('replaces an inventory item with a new item', async () => {
      mockPrismaService.gameProfile.findUnique.mockResolvedValue({ id: 4 });
      mockPrismaService.inventoryItem.findFirst.mockResolvedValue({ id: 15, gameProfileId: 4 });
      mockPrismaService.item.findUnique.mockResolvedValue({ id: 42 });
      mockPrismaService.inventoryItem.create.mockResolvedValue({ id: 99 });

      await expect(
        service.replaceInventoryItem(7, { replaceInventoryItemId: 15, newItemId: 42 }),
      ).resolves.toEqual({ success: true, inventoryItemId: 99 });

      expect(mockPrismaService.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 15 } });
      expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledWith({
        data: {
          gameProfileId: 4,
          itemId: 42,
          quantity: 1,
          slot: null,
          isEquiped: false,
        },
      });
    });
  });
});
