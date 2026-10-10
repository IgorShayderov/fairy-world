import { PremiumService, PREMIUM_DURATION_MS, premiumActive } from './premium.service';
import { PrismaService } from '../prisma.service';
import { QuickBattleGuard } from './quick-battle.guard';
import { ExecutionContext } from '@nestjs/common';

describe('premium accounts', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const originalEnv = process.env.NODE_ENV;
  const tx = {
    gameProfile: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    premiumAccount: { findUnique: jest.fn(), upsert: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) };
  const service = new PremiumService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    process.env.NODE_ENV = 'production';
    tx.gameProfile.updateMany.mockResolvedValue({ count: 1 });
    tx.gameProfile.findUniqueOrThrow.mockResolvedValue({ id: 7, gems: 300 });
    tx.premiumAccount.findUnique.mockResolvedValue(null);
    tx.premiumAccount.findFirst.mockResolvedValue(null);
    tx.premiumAccount.upsert.mockImplementation(({ create }) => Promise.resolve(create));
  });
  afterEach(() => {
    jest.useRealTimers();
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
  });

  it('charges exactly 200 gems and grants 30 days', async () => {
    const result = await service.buy(1);
    expect(result.expiresAt.getTime()).toBe(now.getTime() + PREMIUM_DURATION_MS);
    expect(result.gems).toBe(300);
    expect(tx.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 1, gems: { gte: 200 } },
      data: { gems: { decrement: 200 } },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('extends an unexpired membership without discarding time', async () => {
    const end = new Date(now.getTime() + 5 * 86400000);
    tx.premiumAccount.findUnique.mockResolvedValue({ active: true, expiresAt: end });
    expect((await service.buy(1)).expiresAt.getTime()).toBe(end.getTime() + PREMIUM_DURATION_MS);
  });
  it('restarts an expired membership from now', async () => {
    tx.premiumAccount.findUnique.mockResolvedValue({ active: false, expiresAt: new Date('2026-01-01') });
    expect((await service.buy(1)).expiresAt.getTime()).toBe(now.getTime() + PREMIUM_DURATION_MS);
  });
  it('does not grant premium when gems are insufficient', async () => {
    tx.gameProfile.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.buy(1)).rejects.toThrow('200 gems');
    expect(tx.premiumAccount.upsert).not.toHaveBeenCalled();
  });
  it('rejects non-premium users and expires access at the exact deadline before cron runs', async () => {
    await expect(service.assertQuickBattle(1)).rejects.toThrow('premium');
    tx.premiumAccount.findFirst.mockResolvedValue({ active: true, expiresAt: now });
    await expect(service.assertQuickBattle(1)).rejects.toThrow('premium');
    expect(premiumActive({ active: false, expiresAt: new Date('2027-01-01') })).toBe(false);
  });
  it('allows active premium and explicit development mode only', async () => {
    tx.premiumAccount.findFirst.mockResolvedValue({ active: true, expiresAt: new Date('2027-01-01') });
    await expect(service.assertQuickBattle(1)).resolves.toBeUndefined();
    tx.premiumAccount.findFirst.mockResolvedValue(null);
    process.env.NODE_ENV = 'development';
    await expect(service.assertQuickBattle(1)).resolves.toBeUndefined();
    delete process.env.NODE_ENV;
    await expect(service.assertQuickBattle(1)).rejects.toThrow('premium');
  });
  it('deactivates expired accounts on cron and startup without deleting records', async () => {
    await service.expireAccounts();
    await service.onApplicationBootstrap();
    expect(tx.premiumAccount.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.premiumAccount.updateMany).toHaveBeenCalledWith({
      where: { active: true, expiresAt: { lte: now } },
      data: { active: false },
    });
  });
  it('guards the authenticated user, not a caller-supplied user id', async () => {
    const guard = new QuickBattleGuard(service);
    const context = { switchToHttp: () => ({ getRequest: () => ({ user: { sub: 42 }, body: { userId: 1 } }) }) };
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow('premium');
    expect(tx.premiumAccount.findFirst).toHaveBeenCalledWith({ where: { gameProfile: { userId: 42 } } });
  });
});
