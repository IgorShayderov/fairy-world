import type { PrismaService } from '../prisma.service';
import { BLACKSMITH_REMOVAL_COST, BLACKSMITH_REMOVAL_GEM_COST, LocationsService } from './locations.service';
import { encounterLandmarks } from './landmarks';

describe('Blacksmith bonus removal', () => {
  const position = encounterLandmarks.BLACKSMITH;
  const profile = {
    id: 5,
    gold: 2500,
    gems: 25,
    mapPositionX: position.x,
    mapPositionY: position.y,
    dungeonRun: null,
    dungeonParty: null,
  };
  const tx = {
    $executeRaw: jest.fn(),
    gameProfile: { findUnique: jest.fn(), updateMany: jest.fn() },
    inventoryItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    ...tx,
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  const service = new LocationsService(prisma);
  beforeEach(() => {
    jest.resetAllMocks();
    tx.gameProfile.findUnique.mockResolvedValue(profile);
    tx.gameProfile.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryItem.findFirst.mockResolvedValue({ id: 42, upgradeType: 'HEALTH', upgradeValue: 30 });
    tx.inventoryItem.findMany.mockResolvedValue([]);
  });
  it('charges both currencies and removes only the applied bonus, never deletes or refunds the item', async () => {
    await expect(service.removeItemBonus(7, 42, BLACKSMITH_REMOVAL_COST, BLACKSMITH_REMOVAL_GEM_COST)).resolves.toEqual(
      {
        success: true,
        cost: 1000,
        gemCost: 10,
      },
    );
    expect(tx.inventoryItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 42,
        gameProfileId: 5,
        upgradeType: { not: null },
        quantity: 1,
        item: { isConsumable: false },
        OR: [{ isEquiped: true }, { slot: null }],
      },
    });
    expect(tx.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 5, gold: { gte: 1000 }, gems: { gte: 10 } },
      data: { gold: { decrement: 1000 }, gems: { decrement: 10 } },
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { upgradeType: null, upgradeValue: null },
    });
    expect(tx.inventoryItem.delete).not.toHaveBeenCalled();
    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
  });
  it('requires travel to the forge for both listing and removal', async () => {
    tx.gameProfile.findUnique.mockResolvedValue({ ...profile, mapPositionX: 0, mapPositionY: 0 });
    await expect(service.blacksmith(7)).rejects.toThrow('Travel');
    await expect(service.removeItemBonus(7, 42, 1000, 10)).rejects.toThrow('Travel');
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
  });
  it('rejects unowned, already stripped or ineligible items without charging', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue(null);
    await expect(service.removeItemBonus(7, 42, 1000, 10)).rejects.toThrow('owned equipment');
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
  });
  it('rejects insufficient funds, changed price, and active dungeons', async () => {
    await expect(service.removeItemBonus(7, 42, 100, 0)).rejects.toThrow('price changed');
    await expect(service.removeItemBonus(7, 42, 1000, 0)).rejects.toThrow('price changed');
    tx.gameProfile.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.removeItemBonus(7, 42, 1000, 10)).rejects.toThrow('Not enough gold or gems');
    tx.gameProfile.findUnique.mockResolvedValue({ ...profile, dungeonRun: { id: 'run' } });
    await expect(service.removeItemBonus(7, 42, 1000, 10)).rejects.toThrow('Leave the dungeon');
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });
  it('quotes both costs and both balances', async () => {
    await expect(service.blacksmith(7)).resolves.toMatchObject({ cost: 1000, gemCost: 10, gold: 2500, gems: 25 });
  });
  it.each([
    { gold: 999, gems: 10 },
    { gold: 1000, gems: 9 },
  ])('requires enough of each currency: %j', async (balance) => {
    tx.gameProfile.findUnique.mockResolvedValue({ ...profile, ...balance });
    tx.gameProfile.updateMany.mockImplementation(
      ({ where }: { where: { gold: { gte: number }; gems: { gte: number } } }) => ({
        count: balance.gold >= where.gold.gte && balance.gems >= where.gems.gte ? 1 : 0,
      }),
    );
    await expect(service.removeItemBonus(7, 42, 1000, 10)).rejects.toThrow('Not enough gold or gems');
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });
});
