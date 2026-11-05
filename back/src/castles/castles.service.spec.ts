/* In-memory Prisma test adapter deliberately models the dynamic delegate arguments. */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { Castle } from '../../generated/client';
import { CastlesService } from './castles.service';
import { PrismaService } from '../prisma.service';

const now = new Date('2026-11-03T12:00:00Z');
function castle(id = 'a', profileId = 1): Castle {
  return {
    id,
    profileId,
    name: `Keep ${id}`,
    x: 1100,
    y: 650,
    city: 'AURELIA',
    keep: 2,
    lumberMill: 1,
    quarry: 1,
    storehouse: 0,
    barracks: 2,
    forge: 0,
    wood: 1000,
    stone: 1000,
    producedAt: now,
    construction: null,
    constructionEndsAt: null,
    sentinels: 20,
    rangers: 0,
    arcanists: 0,
    training: null,
    trainingCount: 0,
    trainingEndsAt: null,
    rating: 100,
    victories: 0,
    raidTarget: null,
    raidSentinels: 0,
    raidRangers: 0,
    raidArcanists: 0,
    raidPower: 0,
    raidEndsAt: null,
    raidCooldownUntil: null,
    protectedUntil: null,
    createdAt: now,
  };
}

describe('castle service ownership and economy', () => {
  let service: CastlesService,
    db: Map<string, Castle>,
    reports: Record<string, unknown>[],
    profile: { id: number; level: number; gold: number },
    prisma: any;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    db = new Map([
      ['a', castle()],
      ['b', castle('b', 2)],
    ]);
    reports = [];
    profile = { id: 1, level: 25, gold: 5000 };
    const lookup = (where: any) =>
      [...db.values()].find((c) => (where.id ? c.id === where.id : c.profileId === where.profileId));
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      gameProfile: {
        findUnique: jest.fn(async () => ({ ...profile })),
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (profile.gold < where.gold.gte) return { count: 0 };
          profile.gold -= data.gold.decrement;
          return { count: 1 };
        }),
      },
      castle: {
        findFirst: jest.fn(async () => null), // due-raid processing is exercised explicitly below
        findUnique: jest.fn(async ({ where, include }: any) => {
          const c = lookup(where);
          return c
            ? {
                ...structuredClone(c),
                ...(include ? { profile: { userId: c.profileId, user: { name: `Player ${c.profileId}` } } } : {}),
              }
            : null;
        }),
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: any) => {
          const c = { ...castle('new', data.profileId), ...data };
          db.set(c.id, c);
          return c;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const c = { ...db.get(where.id)!, ...structuredClone(data) };
          db.set(c.id, c);
          return c;
        }),
      },
      castleReport: {
        findMany: jest.fn(async () => reports),
        create: jest.fn(async ({ data }: any) => {
          reports.push(data);
          return data;
        }),
      },
    };
    // Serial transactions + rollback model the player's advisory lock and atomic debits.
    let tail = Promise.resolve();
    prisma.$transaction = jest.fn((work: any) => {
      const result = tail.then(async () => {
        const before = structuredClone(db),
          gold = profile.gold,
          length = reports.length;
        try {
          return await work(prisma);
        } catch (error) {
          db = before;
          profile.gold = gold;
          reports.length = length;
          throw error;
        }
      });
      tail = result.catch(() => {});
      return result;
    });
    service = new CastlesService(prisma as PrismaService);
  });
  afterEach(() => jest.useRealTimers());
  it('requires level 25 and charges foundation once', async () => {
    db.delete('a');
    profile.level = 24;
    await expect(service.create(1, { name: 'New Keep', x: 1100, y: 650 })).rejects.toThrow('level 25');
    expect(profile.gold).toBe(5000);
    profile.level = 25;
    await service.create(1, { name: 'New Keep', x: 1100, y: 650 });
    expect(profile.gold).toBe(2500);
    expect(prisma.castle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lumberMill: 1, quarry: 1 }),
    });
    await expect(service.create(1, { name: 'Other Keep', x: 1100, y: 650 })).rejects.toThrow('already');
    expect(profile.gold).toBe(2500);
  });
  it('rejects invalid terrain and insufficient gold without creating a castle', async () => {
    db.delete('a');
    await expect(service.create(1, { name: 'Bad Keep', x: 940, y: 620 })).rejects.toThrow('space');
    profile.gold = 100;
    await expect(service.create(1, { name: 'Poor Keep', x: 1100, y: 650 })).rejects.toThrow('gold');
    expect(db.size).toBe(1);
  });
  it('serializes duplicate construction requests and deducts once', async () => {
    const result = await Promise.allSettled([service.upgrade(1, 'storehouse'), service.upgrade(1, 'storehouse')]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(db.get('a')?.wood).toBe(900);
    expect(db.get('b')?.wood).toBe(1000);
  });
  it('rejects unknown, max-level and keep-locked buildings', async () => {
    await expect(service.upgrade(1, 'constructor')).rejects.toThrow('Unknown');
    db.get('a')!.keep = 10;
    await expect(service.upgrade(1, 'keep')).rejects.toThrow('Maximum');
    db.get('a')!.keep = 1;
    await expect(service.upgrade(1, 'lumberMill')).rejects.toThrow('Crownkeep');
  });
  it('splits offline production at construction completion and settles only once', async () => {
    const c = db.get('a')!;
    c.wood = 0;
    c.stone = 0;
    c.producedAt = new Date(now.getTime() - 7200000);
    c.construction = 'lumberMill';
    c.constructionEndsAt = new Date(now.getTime() - 3600000);
    const result = await service.get(1);
    expect(result.castle?.wood).toBe(360);
    expect(result.castle?.lumberMill).toBe(2);
    expect(result.castle?.rating).toBe(150);
    await service.get(1);
    expect(db.get('a')?.rating).toBe(150);
    expect(db.get('a')?.wood).toBe(360);
  });
  it('counts deployed units toward training capacity', async () => {
    const c = db.get('a')!;
    c.raidSentinels = 20;
    await expect(service.train(1, 'sentinels', 1)).rejects.toThrow('capacity');
  });
  it('validates training count and unit unlocks', async () => {
    await expect(service.train(1, 'sentinels', -1)).rejects.toThrow('Invalid');
    await expect(service.train(1, 'sentinels', 1.5)).rejects.toThrow('Invalid');
    await expect(service.train(1, 'arcanists', 1)).rejects.toThrow('barracks');
  });
  it('charges training once and completes it once', async () => {
    await service.train(1, 'rangers', 2);
    expect(db.get('a')?.wood).toBe(950);
    await expect(service.train(1, 'rangers', 2)).rejects.toThrow('progress');
    jest.setSystemTime(now.getTime() + 120000);
    await service.get(1);
    await service.get(1);
    expect(db.get('a')?.rangers).toBe(2);
    expect(db.get('a')?.training).toBeNull();
  });
  it('rejects self attacks, protected opponents, level mismatches, and unavailable troops', async () => {
    const dto = { target: 'a', sentinels: 10, rangers: 0, arcanists: 0 };
    await expect(service.raid(1, dto)).rejects.toThrow('own');
    dto.target = 'b';
    db.get('b')!.protectedUntil = new Date(now.getTime() + 10000);
    await expect(service.raid(1, dto)).rejects.toThrow('protected');
    db.get('b')!.protectedUntil = null;
    db.get('b')!.keep = 5;
    await expect(service.raid(1, dto)).rejects.toThrow('levels');
    db.get('b')!.keep = 2;
    dto.sentinels = 21;
    await expect(service.raid(1, dto)).rejects.toThrow('troops');
  });
  it('reserves army on departure and removes protection', async () => {
    db.get('a')!.protectedUntil = new Date(now.getTime() + 86400000);
    await service.raid(1, { target: 'b', sentinels: 10, rangers: 0, arcanists: 0 });
    expect(db.get('a')).toMatchObject({ sentinels: 10, raidSentinels: 10, raidPower: 100, protectedUntil: null });
    await expect(service.raid(1, { target: 'b', sentinels: 1, rangers: 0, arcanists: 0 })).rejects.toThrow('already');
  });
  it('transfers PvP loot once, returns survivors, protects defender and writes both reports', async () => {
    db.get('b')!.sentinels = 0;
    await service.raid(1, { target: 'b', sentinels: 20, rangers: 0, arcanists: 0 });
    jest.setSystemTime(now.getTime() + 180000);
    await service.resolveRaid('a');
    const after = structuredClone(db.get('a'));
    expect(after).toMatchObject({ victories: 1, raidTarget: null, sentinels: 16, rating: 130 });
    expect(db.get('b')?.protectedUntil).not.toBeNull();
    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({ kind: 'DEFENSE', wood: 100, stone: 100 });
    expect(after!.wood + db.get('b')!.wood).toBeCloseTo(2012); // 3 minutes of wood production each
    await service.resolveRaid('a');
    expect(db.get('a')).toEqual(after);
    expect(reports).toHaveLength(2);
  });
  it('returns troops unharmed when opponent disappears or gains protection in transit', async () => {
    await service.raid(1, { target: 'b', sentinels: 10, rangers: 0, arcanists: 0 });
    db.delete('b');
    jest.setSystemTime(now.getTime() + 180000);
    await service.resolveRaid('a');
    expect(db.get('a')?.sentinels).toBe(20);
    expect(reports[0]).toMatchObject({ kind: 'RETURN', wood: 0, stone: 0 });
  });
  it('never exposes coordinates or exact balances in opponent previews', async () => {
    const preview = await service.preview(1, 'b');
    expect(preview.defense).toBe(300);
    expect(preview.wood).toBe(100);
    expect(preview).not.toHaveProperty('x');
    expect(preview).not.toHaveProperty('profile');
    expect(preview).not.toHaveProperty('sentinels');
  });
  it('leaderboard uses an explicit public-field allowlist', async () => {
    prisma.castle.findMany.mockResolvedValueOnce([
      { ...castle('b', 2), profile: { userId: 2, user: { name: 'Opponent' } } },
    ]);
    const [entry] = await service.leaderboard(1);
    expect(entry.owner).toBe('Opponent');
    expect(entry).not.toHaveProperty('x');
    expect(entry).not.toHaveProperty('wood');
    expect(entry).not.toHaveProperty('profileId');
  });
});
