import { ItemSocketsService } from './item-sockets';
import { PrismaService } from '../prisma.service';
import { matchingStack } from '../items/inventory-stack';

describe('equipment sockets', () => {
  const tx = {
    $executeRaw: jest.fn(),
    gameProfile: { findUnique: jest.fn(), updateMany: jest.fn() },
    inventoryItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    equipmentGem: { findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
    gemActionPrice: { findUnique: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const service = new ItemSocketsService(prisma as unknown as PrismaService);
  const item = {
    id: 42,
    itemId: 2,
    quantity: 1,
    isEquiped: true,
    slot: 'head',
    hasSocket: false,
    upgradeType: 'HEALTH',
    upgradeValue: 30,
    socketGemType: null,
    socketGemValue: null,
    item: { level: 10, name: 'Helmet', rarity: 'RARE', isConsumable: false, equipmentType: ['HELMET'] },
  };
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((work: (client: typeof tx) => unknown) => work(tx));
    tx.gameProfile.findUnique.mockResolvedValue({ id: 1, mapPositionX: 1490, mapPositionY: 740 });
    tx.gameProfile.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryItem.findFirst.mockResolvedValue(item);
    tx.inventoryItem.count.mockResolvedValue(0);
    tx.gemActionPrice.findUnique.mockResolvedValue(null);
  });
  it('charges 500 gold per item level plus 10 currency gems, preserving the crafting bonus', async () => {
    await service.change(7, 42, 'add', { expectedCost: 5000, expectedGemCost: 10 });
    expect(tx.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 1, gold: { gte: 5000 }, gems: { gte: 10 } },
      data: { gold: { decrement: 5000 }, gems: { decrement: 10 } },
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({ where: { id: 42 }, data: { hasSocket: true } });
  });
  it('splits one equipment instance out of a stack without duplicating bonuses', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({ ...item, isEquiped: false, slot: null, quantity: 3 });
    await service.change(7, 42, 'add', { expectedCost: 5000, expectedGemCost: 10 });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({ where: { id: 42 }, data: { quantity: { decrement: 1 } } });
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: 1, hasSocket: true, upgradeType: 'HEALTH', upgradeValue: 30 }) as unknown,
    });
  });
  it('uses admin prices and rejects stale client quotes', async () => {
    tx.gemActionPrice.findUnique.mockResolvedValue({ cost: 20 });
    await expect(service.change(7, 42, 'add', { expectedCost: 5000, expectedGemCost: 10 })).rejects.toThrow(
      'price changed',
    );
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
    await service.change(7, 42, 'add', { expectedCost: 200, expectedGemCost: 20 });
    expect(tx.inventoryItem.update).toHaveBeenCalled();
  });
  it('inserts only an owned gem into an empty socket and consumes the gem', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({ ...item, hasSocket: true });
    tx.equipmentGem.findFirst.mockResolvedValue({ id: 'gem', type: 'DAMAGE', value: 12 });
    await service.change(7, 42, 'insert', { expectedCost: 0, expectedGemCost: 0, gemId: 'gem' });
    expect(tx.equipmentGem.findFirst).toHaveBeenCalledWith({ where: { id: 'gem', gameProfileId: 1 } });
    expect(tx.equipmentGem.delete).toHaveBeenCalledWith({ where: { id: 'gem' } });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { socketGemType: 'DAMAGE', socketGemValue: 12 },
    });
  });
  it('removes the socket and destroys the gem for 100 gold per item level', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({
      ...item,
      hasSocket: true,
      socketGemType: 'DAMAGE',
      socketGemValue: 12,
    });
    await service.change(7, 42, 'remove', { expectedCost: 1000, expectedGemCost: 0 });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { hasSocket: false, socketGemType: null, socketGemValue: null },
    });
    expect(tx.gameProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { gold: { decrement: 1000 }, gems: { decrement: 0 } } }),
    );
  });
  it('rejects duplicate sockets, occupied sockets and another player’s gem', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({ ...item, hasSocket: true, socketGemType: 'DAMAGE' });
    await expect(service.change(7, 42, 'add', { expectedCost: 5000, expectedGemCost: 10 })).rejects.toThrow('already');
    await expect(
      service.change(7, 42, 'insert', { expectedCost: 0, expectedGemCost: 0, gemId: 'other' }),
    ).rejects.toThrow('already');
    tx.inventoryItem.findFirst.mockResolvedValue({ ...item, hasSocket: true });
    tx.equipmentGem.findFirst.mockResolvedValue(null);
    await expect(
      service.change(7, 42, 'insert', { expectedCost: 0, expectedGemCost: 0, gemId: 'other' }),
    ).rejects.toThrow('not found');
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });
  it('rejects unowned equipment, insufficient funds and use away from the Blacksmith', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue(null);
    await expect(service.change(7, 42, 'add', { expectedCost: 5000, expectedGemCost: 10 })).rejects.toThrow('owned');
    tx.inventoryItem.findFirst.mockResolvedValue(item);
    tx.gameProfile.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.change(7, 42, 'add', { expectedCost: 5000, expectedGemCost: 10 })).rejects.toThrow(
      'Not enough',
    );
    tx.gameProfile.findUnique.mockResolvedValue({ id: 1, mapPositionX: 0, mapPositionY: 0 });
    await expect(service.offer(7)).rejects.toThrow('Travel');
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });
  it('never merges socketed equipment when equipping or unequipping', () => {
    expect(matchingStack({ hasSocket: true, upgradeType: null, upgradeValue: null })).toEqual({ id: -1 });
    expect(matchingStack({ hasSocket: false, upgradeType: 'HEALTH', upgradeValue: 30 })).toEqual({
      hasSocket: false,
      upgradeType: 'HEALTH',
      upgradeValue: 30,
    });
  });
});
