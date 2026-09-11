import { ShopService } from './shop.service';
import { PrismaService } from '../prisma.service';
import { ItemGeneratorService } from '../items/item-generator.service';

describe('ShopService trades', () => {
  const tx = {
    shop: { findUnique: jest.fn(), update: jest.fn() },
    shopStock: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    gameProfile: { findUnique: jest.fn(), update: jest.fn() },
    inventoryItem: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn(), create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const itemGenerator = { generate: jest.fn() };
  const service = new ShopService(prisma as unknown as PrismaService, itemGenerator as unknown as ItemGeneratorService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation: (client: typeof tx) => unknown) => operation(tx));
    tx.shop.findUnique.mockResolvedValue({ id: 2, gold: 1000, nextRestockAt: new Date('2099-01-01') });
    tx.gameProfile.findUnique.mockResolvedValue({ id: 5, gold: 200, level: 4 });
    tx.shopStock.findUnique.mockResolvedValue({ quantity: 10, item: { price: 20 } });
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 8,
      gameProfileId: 5,
      itemId: 3,
      quantity: 7,
      item: { price: 20 },
    });
  });

  afterEach(() => jest.useRealTimers());

  it('sells the requested quantity and credits only the selected shop stock', async () => {
    const result = await service.sell(1, 2, { itemId: 3, quantity: 4 });
    expect(result).toEqual({ success: true, itemId: 3, quantity: 4, earnedGold: 40 });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { quantity: { decrement: 4 } },
    });
    expect(tx.shopStock.upsert).toHaveBeenCalledWith({
      where: { shopId_itemId: { shopId: 2, itemId: 3 } },
      update: { quantity: { increment: 4 } },
      create: { shopId: 2, itemId: 3, quantity: 4 },
    });
    expect(tx.shop.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { gold: { decrement: 40 } } });
    expect(tx.gameProfile.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { gold: { increment: 40 } } });
    expect(tx.inventoryItem.delete).not.toHaveBeenCalled();
  });

  it('removes a fully sold stack and returns all seven items', async () => {
    const result = await service.sell(1, 2, { itemId: 3, quantity: 7 });
    expect(result.quantity).toBe(7);
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 8 } });
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
    expect(tx.shopStock.upsert).toHaveBeenCalledWith({
      where: { shopId_itemId: { shopId: 2, itemId: 3 } },
      update: { quantity: { increment: 7 } },
      create: { shopId: 2, itemId: 3, quantity: 7 },
    });
  });

  it('rejects a sale when the shop cannot afford it before any mutation', async () => {
    tx.shop.findUnique.mockResolvedValue({ id: 2, gold: 5 });
    await expect(service.sell(1, 2, { itemId: 3, quantity: 4 })).rejects.toThrow('Shop does not have enough gold');
    expect(tx.shop.update).not.toHaveBeenCalled();
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('rejects selling more than the owned quantity', async () => {
    await expect(service.sell(1, 2, { itemId: 3, quantity: 8 })).rejects.toThrow('Not enough items');
    expect(tx.shopStock.upsert).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, undefined])(
    'rejects invalid quantity %s instead of defaulting to one',
    async (quantity) => {
      await expect(service.sell(1, 2, { itemId: 3, quantity: quantity as number })).rejects.toThrow('positive integer');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('buys exactly the selected quantity and transfers gold into that shop', async () => {
    await expect(service.buy(1, 2, { itemId: 3, quantity: 3 })).resolves.toEqual({
      success: true,
      itemId: 3,
      quantity: 3,
      totalCost: 60,
    });
    expect(tx.shopStock.update).toHaveBeenCalledWith({
      where: { shopId_itemId: { shopId: 2, itemId: 3 } },
      data: { quantity: { decrement: 3 } },
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { quantity: { increment: 3 } },
    });
    expect(tx.shop.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { gold: { increment: 60 } } });
  });

  it('removes a sold-out stock entry instead of keeping a zero quantity', async () => {
    tx.shopStock.findUnique.mockResolvedValue({ quantity: 3, item: { price: 20 } });

    await service.buy(1, 2, { itemId: 3, quantity: 3 });

    expect(tx.shopStock.delete).toHaveBeenCalledWith({
      where: { shopId_itemId: { shopId: 2, itemId: 3 } },
    });
    expect(tx.shopStock.update).not.toHaveBeenCalled();
  });

  it('does not buy an item stocked only by another shop', async () => {
    tx.shopStock.findUnique.mockResolvedValue(null);
    await expect(service.buy(1, 2, { itemId: 3, quantity: 1 })).rejects.toThrow('Item not found in shop');
    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
  });

  it('returns stock and balances from the database in one extensible response', async () => {
    const nextRestockAt = new Date('2099-01-01');
    tx.shop.findUnique.mockResolvedValue({
      id: 2,
      name: 'Armory',
      gold: 500,
      nextRestockAt,
      stock: [{ quantity: 9, item: { id: 3, name: 'Shield', attributes: [], stats: [] } }],
    });
    await expect(service.getShop(1, 2)).resolves.toEqual({
      id: 2,
      name: 'Armory',
      gold: 500,
      nextRestockAt,
      items: [{ id: 3, name: 'Shield', quantity: 9, attributes: [], properties: [] }],
    });
    expect(tx.shopStock.deleteMany).toHaveBeenCalledWith({ where: { shopId: 2, quantity: { lte: 0 } } });
    expect(itemGenerator.generate).not.toHaveBeenCalled();
  });

  it('generates twelve items with levels around the player level when the shop restock is due', async () => {
    const now = new Date('2026-09-11T09:00:00Z');
    const nextRestockAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    jest.useFakeTimers().setSystemTime(now);
    tx.shop.findUnique
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: 500, nextRestockAt: null })
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: 500, nextRestockAt, stock: [] });
    itemGenerator.generate.mockResolvedValue({ id: 42 });

    await service.getShop(1, 2);

    expect(itemGenerator.generate).toHaveBeenCalledTimes(12);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(1, { level: 2 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(2, { level: 3 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(3, { level: 4 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(4, { level: 5 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(5, { level: 6 }, tx);
    expect(tx.shopStock.deleteMany).toHaveBeenCalledWith({ where: { shopId: 2 } });
    expect(tx.shopStock.create).toHaveBeenCalledTimes(12);
    expect(tx.shop.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nextRestockAt },
    });
  });
});
