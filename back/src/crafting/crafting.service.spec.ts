import { CraftUpgradeType } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { CraftingService } from './crafting.service';

describe('CraftingService', () => {
  it('applies a crafted catalyst to an equipped item and consumes the catalyst', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      gameProfile: { findUnique: jest.fn().mockResolvedValue({ id: 4, level: 18 }) },
      inventoryItem: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 3,
            gameProfileId: 4,
            quantity: 1,
            isEquiped: false,
            upgradeValue: 30,
            item: { name: 'Vitality Crystal' },
          })
          .mockResolvedValueOnce({
            id: 12,
            gameProfileId: 4,
            itemId: 8,
            quantity: 1,
            isEquiped: true,
            upgradeType: null,
            item: { isConsumable: false, equipmentType: ['BODY'] },
          }),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new CraftingService(prisma as unknown as PrismaService);

    await expect(service.applyUpgrade(7, 3, 12)).resolves.toEqual({
      success: true,
      inventoryItemId: 12,
      upgradeType: CraftUpgradeType.HEALTH,
      value: 30,
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { upgradeType: CraftUpgradeType.HEALTH, upgradeValue: 30 },
    });
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it('rejects a second upgrade before consuming another crafted upgrade item', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      gameProfile: { findUnique: jest.fn().mockResolvedValue({ id: 4, level: 18 }) },
      inventoryItem: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 3,
            gameProfileId: 4,
            quantity: 1,
            item: { name: 'Runed Millstone' },
          })
          .mockResolvedValueOnce({
            id: 12,
            gameProfileId: 4,
            quantity: 1,
            upgradeType: CraftUpgradeType.DAMAGE,
            item: { isConsumable: false, equipmentType: ['WEAPON'] },
          }),
      },
    };
    const prisma = {
      $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new CraftingService(prisma as unknown as PrismaService);

    await expect(service.applyUpgrade(7, 3, 12)).rejects.toThrow('This item has already been upgraded');
  });

  it('does not consume ingredients when the regular inventory is full', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      gameProfile: { findUnique: jest.fn().mockResolvedValue({ id: 4, level: 18 }) },
      learnedCraftRecipe: {
        findUnique: jest.fn().mockResolvedValue({
          recipe: {
            resultCraftItem: { name: 'Runed Millstone' },
            ingredients: [{ craftItemId: 2, quantity: 3 }],
          },
        }),
      },
      inventoryItem: { count: jest.fn().mockResolvedValue(24) },
      playerCraftItem: { findUnique: jest.fn(), delete: jest.fn(), update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new CraftingService(prisma as unknown as PrismaService);

    await expect(service.craft(7, 5)).rejects.toThrow('Inventory is full');
    expect(tx.playerCraftItem.findUnique).not.toHaveBeenCalled();
  });

  it('charges the scaled material cost and snapshots the crafted upgrade strength', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      gameProfile: { findUnique: jest.fn().mockResolvedValue({ id: 4, level: 18 }) },
      learnedCraftRecipe: {
        findUnique: jest.fn().mockResolvedValue({
          recipe: {
            resultQuantity: 1,
            resultCraftItem: {
              name: 'Vitality Crystal',
              upgradeType: CraftUpgradeType.HEALTH,
            },
            ingredients: [{ craftItemId: 2, quantity: 2 }],
          },
        }),
      },
      inventoryItem: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 90 }),
      },
      item: { findFirst: jest.fn().mockResolvedValue({ id: 40 }) },
      playerCraftItem: {
        findUnique: jest.fn().mockResolvedValue({ quantity: 11 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ quantity: 11 }),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new CraftingService(prisma as unknown as PrismaService);

    await expect(service.craft(7, 5)).resolves.toMatchObject({
      success: true,
      inventoryItemId: 90,
      quantity: 1,
    });
    expect(tx.playerCraftItem.update).toHaveBeenCalledWith({
      where: { gameProfileId_craftItemId: { gameProfileId: 4, craftItemId: 2 } },
      data: { quantity: { decrement: 8 } },
    });
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: {
        gameProfileId: 4,
        itemId: 40,
        quantity: 1,
        slot: null,
        isEquiped: false,
        upgradeType: CraftUpgradeType.HEALTH,
        upgradeValue: 50,
      },
    });
  });

  it('rejects crafting and upgrades before level 10', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      gameProfile: { findUnique: jest.fn().mockResolvedValue({ id: 4, level: 9 }) },
      learnedCraftRecipe: { findUnique: jest.fn() },
      inventoryItem: { findFirst: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new CraftingService(prisma as unknown as PrismaService);

    await expect(service.craft(7, 5)).rejects.toThrow('available from level 10');
    await expect(service.applyUpgrade(7, 3, 12)).rejects.toThrow('available from level 10');
    expect(tx.learnedCraftRecipe.findUnique).not.toHaveBeenCalled();
    expect(tx.inventoryItem.findFirst).not.toHaveBeenCalled();
  });
});
