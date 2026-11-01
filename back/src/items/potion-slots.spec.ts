import type { PrismaService } from '../prisma.service';
import { assignPotionSlot, ensurePotionSlotAccess } from './potion-slots';
import type { Prisma } from '../../generated/client';

describe('Potion quick slots', () => {
  const tx = {
    $executeRaw: jest.fn(),
    gameProfile: { findUnique: jest.fn() },
    premiumAccount: { findUnique: jest.fn() },
    inventoryItem: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn() },
  };
  const prisma = {
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  const source = { id: 10, itemId: 99, quantity: 3, item: { name: 'Minor Health Potion', isConsumable: true } };
  beforeEach(() => {
    jest.resetAllMocks();
    tx.gameProfile.findUnique.mockResolvedValue({ id: 5, level: 20 });
  });
  it('reserves exactly one potion from a backpack stack', async () => {
    tx.inventoryItem.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(source);
    await assignPotionSlot(prisma, 7, 2, 10);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { quantity: { decrement: 1 } } });
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: { gameProfileId: 5, itemId: 99, quantity: 1, isEquiped: false, slot: 'potion-2' },
    });
  });
  it('moves a single potion without duplicating it', async () => {
    tx.inventoryItem.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...source, quantity: 1 });
    await assignPotionSlot(prisma, 7, 1, 10);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { quantity: 1, slot: 'potion-1' },
    });
    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
  });
  it('does not lose a potion when selecting the same type already in the slot', async () => {
    tx.inventoryItem.findFirst
      .mockResolvedValueOnce({ id: 11, itemId: 99, quantity: 1 })
      .mockResolvedValueOnce({ ...source, quantity: 1 });
    await assignPotionSlot(prisma, 7, 1, 10);
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
    expect(tx.inventoryItem.delete).not.toHaveBeenCalled();
  });
  it('returns a reserved potion to its backpack stack when cleared', async () => {
    tx.inventoryItem.findFirst.mockResolvedValueOnce({ id: 11, itemId: 99, quantity: 1 }).mockResolvedValueOnce(source);
    await assignPotionSlot(prisma, 7, 1, null);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { quantity: { increment: 1 } } });
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 11 } });
  });
  it('rejects non-health potions and invalid slots', async () => {
    tx.inventoryItem.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...source, item: { name: 'Lesser Attack Potion', isConsumable: true } });
    await expect(assignPotionSlot(prisma, 7, 1, 10)).rejects.toThrow('Only health');
    await expect(assignPotionSlot(prisma, 7, 9, 10)).rejects.toThrow('1–8');
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });
  it.each([6, 7, 8])('allows active premium to reserve one potion in slot %i', async (index) => {
    tx.premiumAccount.findUnique.mockResolvedValue({ active: true, expiresAt: new Date(Date.now() + 60_000) });
    tx.inventoryItem.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(source);
    await assignPotionSlot(prisma, 7, index, 10);
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: { gameProfileId: 5, itemId: 99, quantity: 1, isEquiped: false, slot: `potion-${index}` },
    });
  });
  it.each([
    null,
    { active: false, expiresAt: new Date(Date.now() + 60_000) },
    { active: true, expiresAt: new Date(0) },
  ])('rejects assignment and battle consumption without current premium (%j)', async (account) => {
    tx.premiumAccount.findUnique.mockResolvedValue(account);
    await expect(assignPotionSlot(prisma, 7, 6, 10)).rejects.toThrow('require active premium');
    await expect(ensurePotionSlotAccess(tx as unknown as Prisma.TransactionClient, 5, 'potion-8')).rejects.toThrow(
      'require active premium',
    );
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
    expect(tx.inventoryItem.delete).not.toHaveBeenCalled();
  });
  it('lets expired premium players recover potions without renewing', async () => {
    tx.inventoryItem.findFirst.mockResolvedValueOnce({ id: 11, itemId: 99, quantity: 1 }).mockResolvedValueOnce(source);
    await assignPotionSlot(prisma, 7, 8, null);
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 11 } });
    expect(tx.premiumAccount.findUnique).not.toHaveBeenCalled();
  });
});
