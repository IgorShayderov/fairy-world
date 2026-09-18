import { ShopService, SHOP_DEFAULT_GOLD, potionWeightForLevel } from './shop.service';
import { ItemView } from '../common/views/item.view';
import { PrismaService } from '../prisma.service';
import { ItemGeneratorService } from '../items/item-generator.service';

describe('ShopService trades', () => {
  const tx = {
    shop: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    shopStock: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    gameProfile: { findUnique: jest.fn(), update: jest.fn() },
    item: { findMany: jest.fn() },
    inventoryItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const prisma = { $transaction: jest.fn() };
  const itemGenerator = { generate: jest.fn() };
  const service = new ShopService(prisma as unknown as PrismaService, itemGenerator as unknown as ItemGeneratorService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation: (client: typeof tx) => unknown) => operation(tx));
    tx.shop.upsert.mockResolvedValue({ id: 2 });
    tx.shop.findUnique.mockResolvedValue({ id: 2, stockLevel: 4, gold: 1000, nextRestockAt: new Date('2099-01-01') });
    tx.gameProfile.findUnique.mockResolvedValue({
      id: 5,
      gold: 200,
      gems: 20,
      level: 4,
      mapPositionX: 940,
      mapPositionY: 620,
    });
    tx.shopStock.findUnique.mockResolvedValue({ quantity: 10, item: { price: 20 } });
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 8,
      gameProfileId: 5,
      itemId: 3,
      quantity: 7,
      item: { price: 20 },
    });
    tx.inventoryItem.findMany.mockResolvedValue([
      { id: 8, gameProfileId: 5, itemId: 3, quantity: 7, item: { price: 20 } },
      { id: 9, gameProfileId: 5, itemId: 4, quantity: 2, item: { price: 50 } },
    ]);
    tx.item.findMany.mockResolvedValue([
      { id: 101, equipmentType: ['POTION'] },
      { id: 102, equipmentType: ['POTION'] },
    ]);
  });

  afterEach(() => jest.useRealTimers());

  it('sells across multiple dropped stacks with the same item id', async () => {
    tx.inventoryItem.findMany.mockResolvedValue([
      { id: 41, itemId: 3, quantity: 1, item: { price: 20 } },
      { id: 42, itemId: 3, quantity: 1, item: { price: 20 } },
    ]);
    await expect(
      service.sellMany(1, 2, {
        items: [
          { itemId: 3, quantity: 1 },
          { itemId: 3, quantity: 1 },
        ],
      }),
    ).resolves.toMatchObject({ quantity: 2, earnedGold: 20 });
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 41 } });
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 42 } });
    expect(tx.shopStock.upsert).toHaveBeenCalledTimes(1);
  });

  it('resolves a shop by both player and town', async () => {
    await service.buy(1, 2, { itemId: 3, quantity: 1 });
    expect(tx.shop.upsert).toHaveBeenCalledWith({
      where: { ownerId_townId: { ownerId: 5, townId: 2 } },
      create: { ownerId: 5, townId: 2, name: 'AURELIA Market', gold: SHOP_DEFAULT_GOLD },
      update: {},
    });
  });

  it('rejects every shop operation outside a town before mutations', async () => {
    tx.gameProfile.findUnique.mockResolvedValue({ id: 5, mapPositionX: 2000, mapPositionY: 1800 });
    for (const operation of [
      () => service.getShop(1, 2),
      () => service.refresh(1, 2),
      () => service.buy(1, 2, { itemId: 3, quantity: 1 }),
      () => service.sell(1, 2, { itemId: 3, quantity: 1 }),
      () => service.sellMany(1, 2, { items: [{ itemId: 3, quantity: 1 }] }),
    ])
      await expect(operation()).rejects.toThrow('Travel to this town');
    expect(tx.shop.update).not.toHaveBeenCalled();
    expect(tx.shopStock.upsert).not.toHaveBeenCalled();
  });

  it('rejects a different town shop even while standing in a town', async () => {
    await expect(service.getShop(1, 1)).rejects.toThrow('Travel to this town');
  });

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

  it('sells several selected item stacks atomically', async () => {
    const result = await service.sellMany(1, 2, {
      items: [
        { itemId: 3, quantity: 4 },
        { itemId: 4, quantity: 2 },
      ],
    });

    expect(result).toEqual({
      success: true,
      quantity: 6,
      earnedGold: 90,
      items: [
        { itemId: 3, quantity: 4, earnedGold: 40 },
        { itemId: 4, quantity: 2, earnedGold: 50 },
      ],
    });
    expect(tx.shop.update).toHaveBeenCalledTimes(1);
    expect(tx.shop.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { gold: { decrement: 90 } } });
    expect(tx.gameProfile.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { gold: { increment: 90 } } });
    expect(tx.shopStock.upsert).toHaveBeenCalledTimes(2);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { quantity: { decrement: 4 } },
    });
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it('combines duplicate requested item lines into one sale', async () => {
    await expect(
      service.sellMany(1, 2, {
        items: [
          { itemId: 3, quantity: 1 },
          { itemId: 3, quantity: 2 },
        ],
      }),
    ).resolves.toMatchObject({ success: true, quantity: 3, earnedGold: 30 });
    expect(tx.shopStock.upsert).toHaveBeenCalledTimes(1);
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

  it('rejects buying when backpack is full at 24 slots and item is not stackable', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue(null);
    tx.inventoryItem.count.mockResolvedValue(24);
    await expect(service.buy(1, 2, { itemId: 3, quantity: 1 })).rejects.toThrow('Inventory is full');
  });

  it('returns stock and balances from the database in one extensible response', async () => {
    const nextRestockAt = new Date('2099-01-01');
    tx.shop.findUnique.mockResolvedValue({
      id: 2,
      name: 'Armory',
      stockLevel: 4,
      gold: 500,
      nextRestockAt,
      stock: [{ quantity: 9, item: { id: 3, level: 4, name: 'Shield', attributes: [], stats: [] } }],
    });
    await expect(service.getShop(1, 2)).resolves.toEqual({
      id: 2,
      name: 'Armory',
      gold: 500,
      nextRestockAt,
      refreshCost: 10,
      items: [
        {
          id: 3,
          level: 4,
          requiredPlayerLevel: 1,
          isTwoHanded: false,
          name: 'Shield',
          quantity: 9,
          attributes: [],
          properties: [],
        },
      ],
    });
    expect(tx.shopStock.deleteMany).toHaveBeenCalledWith({ where: { shopId: 2, quantity: { lte: 0 } } });
    expect(itemGenerator.generate).not.toHaveBeenCalled();
  });

  it('filters out items that require a player level higher than the current player level', async () => {
    const nextRestockAt = new Date('2099-01-01');
    tx.shop.findUnique.mockResolvedValue({
      id: 2,
      name: 'Armory',
      stockLevel: 4,
      gold: 500,
      nextRestockAt,
      stock: [
        { quantity: 1, item: { id: 3, level: 4, name: 'Shield', attributes: [], stats: [] } },
        { quantity: 1, item: { id: 4, level: 19, name: 'High Shield', attributes: [], stats: [] } },
      ],
    });
    const result = await service.getShop(1, 2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(3);
  });

  it('rejects buying an item that requires a higher player level than current player level', async () => {
    tx.shopStock.findUnique.mockResolvedValue({
      quantity: 1,
      item: { id: 4, level: 19, price: 50, isConsumable: false },
    });
    await expect(service.buy(1, 2, { itemId: 4, quantity: 1 })).rejects.toThrow('This item requires player level 16');
  });

  it('filters out potions that require a player level higher than the current player level', async () => {
    const nextRestockAt = new Date('2099-01-01');
    tx.shop.findUnique.mockResolvedValue({
      id: 2,
      name: 'Armory',
      stockLevel: 4,
      gold: 500,
      nextRestockAt,
      stock: [
        { quantity: 1, item: { id: 3, level: 4, isConsumable: false, name: 'Shield', attributes: [], stats: [] } },
        {
          quantity: 1,
          item: { id: 10, level: 10, isConsumable: true, name: 'Lesser Attack Potion', attributes: [], stats: [] },
        },
      ],
    });
    const result = await service.getShop(1, 2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(3);
  });

  it('rejects buying a potion that requires a higher player level than current player level', async () => {
    tx.shopStock.findUnique.mockResolvedValue({
      quantity: 1,
      item: { id: 10, level: 10, price: 40, isConsumable: true },
    });
    await expect(service.buy(1, 2, { itemId: 10, quantity: 1 })).rejects.toThrow('This item requires player level 10');
  });

  it('renders requiredPlayerLevel 50 for Higher Attack Potion even if item.level in database is 1', () => {
    const item = {
      id: 99,
      name: 'Higher Attack Potion',
      description: 'Increases Damage by 50 for 4 hours.',
      price: 500,
      icon: 'icon_potion.png',
      isConsumable: true,
      rarity: 'RARE' as const,
      equipmentType: ['POTION' as const],
      level: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [],
      stats: [],
    };
    const rendered = ItemView.render(item);
    expect(rendered.requiredPlayerLevel).toBe(50);
  });

  it('assigns lower weights to higher level potions', () => {
    expect(potionWeightForLevel(10)).toBe(5);
    expect(potionWeightForLevel(20)).toBe(4);
    expect(potionWeightForLevel(30)).toBe(3);
    expect(potionWeightForLevel(40)).toBe(2);
    expect(potionWeightForLevel(50)).toBe(1);
    expect(potionWeightForLevel(50)).toBeLessThan(potionWeightForLevel(10));
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

    expect(itemGenerator.generate).toHaveBeenCalledTimes(10);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(1, { level: 2 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(2, { level: 3 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(3, { level: 4 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(4, { level: 5 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(5, { level: 6 }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(9, { level: 5, equipmentType: 'GLOVES' }, tx);
    expect(itemGenerator.generate).toHaveBeenNthCalledWith(10, { level: 6, equipmentType: 'LEGS' }, tx);
    expect(tx.shopStock.deleteMany).toHaveBeenCalledWith({ where: { shopId: 2 } });
    expect(tx.shopStock.upsert).toHaveBeenCalledTimes(12);
    expect(tx.shopStock.upsert).toHaveBeenCalledWith({
      where: { shopId_itemId: { shopId: 2, itemId: 101 } },
      create: { shopId: 2, itemId: 101, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
    expect(tx.shopStock.upsert).toHaveBeenCalledWith({
      where: { shopId_itemId: { shopId: 2, itemId: 102 } },
      create: { shopId: 2, itemId: 102, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
    expect(tx.shop.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nextRestockAt, stockLevel: 4, gold: SHOP_DEFAULT_GOLD },
    });
  });

  it('spends ten gems and immediately replaces the shop stock', async () => {
    const now = new Date('2026-09-11T09:00:00Z');
    const nextRestockAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    jest.useFakeTimers().setSystemTime(now);
    itemGenerator.generate.mockResolvedValue({ id: 42 });

    await expect(service.refresh(1, 2)).resolves.toEqual({ success: true, cost: 10, nextRestockAt });

    expect(tx.gameProfile.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { gems: { decrement: 10 } },
    });
    expect(tx.shopStock.deleteMany).toHaveBeenCalledWith({ where: { shopId: 2 } });
    expect(itemGenerator.generate).toHaveBeenCalledTimes(10);
    expect(tx.shopStock.upsert).toHaveBeenCalledTimes(12);
    expect(tx.shop.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nextRestockAt, stockLevel: 4, gold: SHOP_DEFAULT_GOLD },
    });
  });

  it('does not refresh stock when the player has fewer than ten gems', async () => {
    tx.gameProfile.findUnique.mockResolvedValue({
      id: 5,
      gold: 200,
      level: 4,
      gems: 9,
      mapPositionX: 940,
      mapPositionY: 620,
    });

    await expect(service.refresh(1, 2)).rejects.toThrow('Not enough gems');

    expect(tx.gameProfile.update).not.toHaveBeenCalled();
    expect(tx.shopStock.deleteMany).not.toHaveBeenCalled();
    expect(itemGenerator.generate).not.toHaveBeenCalled();
  });

  it('resets shop gold to 1 million when stock is restocked', async () => {
    const now = new Date('2026-09-11T09:00:00Z');
    const nextRestockAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    jest.useFakeTimers().setSystemTime(now);
    tx.shop.findUnique
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: 500, nextRestockAt: null })
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: SHOP_DEFAULT_GOLD, nextRestockAt, stock: [] });
    itemGenerator.generate.mockResolvedValue({ id: 42 });

    const result = await service.getShop(1, 2);

    expect(tx.shop.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nextRestockAt, stockLevel: 4, gold: SHOP_DEFAULT_GOLD },
    });
    expect(result.gold).toBe(SHOP_DEFAULT_GOLD);
  });

  it('stocks Free Attribute Potion when player level is 30+ and 3% chance succeeds', async () => {
    const now = new Date('2026-09-11T09:00:00Z');
    const nextRestockAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    jest.useFakeTimers().setSystemTime(now);
    jest.spyOn(Math, 'random').mockReturnValue(0.01);
    tx.shop.findUnique
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: 500, nextRestockAt: null })
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: 500, nextRestockAt, stock: [] });
    tx.gameProfile.findUnique.mockResolvedValue({
      id: 5,
      gold: 200,
      gems: 20,
      level: 30,
      mapPositionX: 940,
      mapPositionY: 620,
    });
    tx.item.findMany.mockResolvedValue([
      { id: 200, name: 'Free Attribute Potion', equipmentType: ['POTION'] },
      { id: 101, name: 'Mild Attack Potion', equipmentType: ['POTION'] },
    ]);
    itemGenerator.generate.mockResolvedValue({ id: 42 });

    await service.getShop(1, 2);

    expect(tx.shopStock.upsert).toHaveBeenCalledWith({
      where: { shopId_itemId: { shopId: 2, itemId: 200 } },
      create: { shopId: 2, itemId: 200, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
  });

  it('does not stock Free Attribute Potion when 3% chance does not roll', async () => {
    const now = new Date('2026-09-11T09:00:00Z');
    const nextRestockAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    jest.useFakeTimers().setSystemTime(now);
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    tx.shop.findUnique
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: 500, nextRestockAt: null })
      .mockResolvedValueOnce({ id: 2, name: 'Armory', gold: 500, nextRestockAt, stock: [] });
    tx.gameProfile.findUnique.mockResolvedValue({
      id: 5,
      gold: 200,
      gems: 20,
      level: 30,
      mapPositionX: 940,
      mapPositionY: 620,
    });
    tx.item.findMany.mockResolvedValue([
      { id: 200, name: 'Free Attribute Potion', equipmentType: ['POTION'] },
      { id: 101, name: 'Mild Attack Potion', equipmentType: ['POTION'] },
      { id: 102, name: 'Mild Defense Potion', equipmentType: ['POTION'] },
    ]);
    itemGenerator.generate.mockResolvedValue({ id: 42 });

    await service.getShop(1, 2);

    expect(tx.shopStock.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopId_itemId: { shopId: 2, itemId: 200 } },
      }),
    );
  });
});
