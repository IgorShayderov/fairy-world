import { SkillsService } from './skills.service';
import { PrismaService } from '../prisma.service';
import { MonstersService } from '../monsters/monsters.service';

describe('paid skill resets', () => {
  const profile = {
    id: 5,
    level: 20,
    gems: 700,
    skillTree: { class: 'MAGE', ranks: { 'mage-fireball': 3 }, version: 2 },
  };
  const db = {
    gameProfile: { findUnique: jest.fn(), updateMany: jest.fn() },
    gameProfileSkillTree: { create: jest.fn(), updateMany: jest.fn() },
  };
  const transaction = jest.fn((operation: (client: typeof db) => unknown) => operation(db));
  const monsters = { hasActiveBattle: jest.fn(), activeDungeon: jest.fn() };
  const service = new SkillsService(
    { ...db, $transaction: transaction } as unknown as PrismaService,
    monsters as unknown as MonstersService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    db.gameProfile.findUnique.mockResolvedValue(profile);
    db.gameProfile.updateMany.mockResolvedValue({ count: 1 });
    db.gameProfileSkillTree.updateMany.mockResolvedValue({ count: 1 });
    monsters.hasActiveBattle.mockReturnValue(false);
    monsters.activeDungeon.mockResolvedValue(null);
  });
  it('debits exactly 500 gems and clears every rank in the same transaction', async () => {
    await service.change(7, { reset: true });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(db.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 5, gems: { gte: 500 } },
      data: { gems: { decrement: 500 } },
    });
    expect(db.gameProfileSkillTree.updateMany).toHaveBeenCalledWith({
      where: { profileId: 5, version: 2 },
      data: { class: 'MAGE', ranks: {}, version: { increment: 1 } },
    });
  });
  it('rejects insufficient funds without changing the tree', async () => {
    db.gameProfile.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.change(7, { reset: true })).rejects.toThrow('500 gems');
    expect(db.gameProfileSkillTree.updateMany).not.toHaveBeenCalled();
  });
  it('does not allow class switching to bypass the reset price', async () => {
    await service.change(7, { class: 'WARRIOR' });
    expect(db.gameProfile.updateMany).toHaveBeenCalledTimes(1);
    expect(db.gameProfileSkillTree.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { class: 'WARRIOR', ranks: {}, version: { increment: 1 } } }),
    );
  });
  it('keeps first class choice free and refuses an empty reset', async () => {
    db.gameProfile.findUnique.mockResolvedValue({ ...profile, skillTree: null });
    await service.change(7, { class: 'MAGE' });
    expect(db.gameProfile.updateMany).not.toHaveBeenCalled();
    db.gameProfile.findUnique.mockResolvedValue({ ...profile, skillTree: { ...profile.skillTree, ranks: {} } });
    await expect(service.change(7, { reset: true })).rejects.toThrow('No allocated skills');
  });
  it('rejects changes during a battle and stale version writes', async () => {
    monsters.hasActiveBattle.mockReturnValueOnce(true);
    await expect(service.change(7, { reset: true })).rejects.toThrow('Finish or leave');
    expect(transaction).not.toHaveBeenCalled();
    db.gameProfileSkillTree.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.change(7, { reset: true })).rejects.toThrow('refresh and try again');
  });
});
