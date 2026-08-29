import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from './shop.service';
import { PrismaService } from '../prisma.service';
import { EquipDto } from './dto/equip.dto';

describe('ShopService', () => {
  let service: ShopService;

  const mockPrismaService = {
    item: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInventory', () => {
    it('should return inventory items for the user with item data', async () => {
      const inventory = [{ id: 1, userId: 7, itemId: 2, quantity: 3, equipped: false, item: { id: 2, name: 'Sword' } }];
      mockPrismaService.inventoryItem.findMany.mockResolvedValue(inventory);

      const result = await service.getInventory(7);

      expect(mockPrismaService.inventoryItem.findMany).toHaveBeenCalledWith({
        where: { userId: 7 },
        include: { item: true },
      });
      expect(result).toEqual(inventory);
    });
  });

  describe('equip', () => {
    it('should set equipped flag on the inventory item', async () => {
      const dto: EquipDto = { inventoryItemId: 5, equipped: true };
      const existing = { id: 5, userId: 7, itemId: 2, quantity: 1, equipped: false };
      const updated = { ...existing, equipped: true };
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(existing);
      mockPrismaService.inventoryItem.update.mockResolvedValue(updated);

      const result = await service.equip(7, dto);

      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { equipped: true },
      });
      expect(result).toEqual(updated);
    });

    it('should throw when the inventory item does not belong to the user', async () => {
      const dto: EquipDto = { inventoryItemId: 5, equipped: true };
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue({ id: 5, userId: 99, quantity: 1 });

      await expect(service.equip(7, dto)).rejects.toThrow('Item not found in inventory');
    });

    it('should throw when quantity is zero', async () => {
      const dto: EquipDto = { inventoryItemId: 5, equipped: true };
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue({ id: 5, userId: 7, quantity: 0 });

      await expect(service.equip(7, dto)).rejects.toThrow('No items of this type to equip');
    });
  });
});
