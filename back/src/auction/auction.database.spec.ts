import { randomUUID } from 'node:crypto';
import { AuctionService } from './auction.service';
import { PrismaService } from '../prisma.service';

// Opt-in integration coverage against a migrated local database. Only these generated fixture IDs are removed.
const databaseTests = process.env.AUCTION_DB_TEST === '1' ? describe : describe.skip;
databaseTests('Auction database transactions', () => {
  let prisma: PrismaService;
  let service: AuctionService;
  const users: Array<{ id: number; profileId: number }> = [];
  const itemIds: number[] = [];
  beforeAll(async () => {
    prisma = new PrismaService();
    service = new AuctionService(prisma);
    await prisma.$connect();
    for (let i = 0; i < 3; i++) {
      const user = await prisma.user.create({
        data: {
          email: `auction-test-${randomUUID()}@example.invalid`,
          password: 'non-login-test-fixture',
          name: 'Auction test',
          gameProfile: { create: { level: 20, gold: 1000, mapPositionX: 1470, mapPositionY: 960 } },
        },
        include: { gameProfile: true },
      });
      users.push({ id: user.id, profileId: user.gameProfile!.id });
    }
    const item = await prisma.item.create({
      data: { name: `Auction test ${randomUUID()}`, level: 23, equipmentType: ['WEAPON'] },
    });
    itemIds.push(item.id);
  });
  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    const profiles = users.map((user) => user.profileId);
    await prisma.auctionListing.deleteMany({ where: { sellerId: { in: profiles } } });
    await prisma.inventoryItem.deleteMany({ where: { gameProfileId: { in: profiles } } });
    await prisma.gameProfile.updateMany({ where: { id: { in: profiles } }, data: { gold: 1000, level: 20 } });
  });
  async function listing(quantity = 1) {
    const entry = await prisma.inventoryItem.create({
      data: {
        gameProfileId: users[0].profileId,
        itemId: itemIds[0],
        quantity,
        isEquiped: false,
        upgradeType: 'DAMAGE',
        upgradeValue: 11,
      },
    });
    const request = { requestId: randomUUID(), inventoryItemId: entry.id, quantity, price: 125, durationHours: 1 };
    await service.create(users[0].id, request);
    return request;
  }
  async function fill(profileId: number) {
    await prisma.inventoryItem.createMany({
      data: Array.from({ length: 24 }, () => ({
        gameProfileId: profileId,
        itemId: itemIds[0],
        quantity: 1,
        isEquiped: false,
      })),
    });
  }
  it('allows exactly one of two concurrent buyers and conserves gold/items', async () => {
    const sale = await listing();
    const attempts = await Promise.allSettled([
      service.buy(users[1].id, sale.requestId),
      service.buy(users[2].id, sale.requestId),
    ]);
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const balances = await prisma.gameProfile.findMany({ where: { id: { in: users.map((user) => user.profileId) } } });
    expect(balances.reduce((total, profile) => total + profile.gold, 0)).toBe(3000);
    expect(balances.find((profile) => profile.id === users[0].profileId)!.gold).toBe(1125);
    const inventory = await prisma.inventoryItem.findMany({ where: { itemId: itemIds[0] } });
    expect(inventory).toHaveLength(1);
    expect(inventory[0].upgradeValue).toBe(11);
    expect(await prisma.playerNotification.count({ where: { listingId: sale.requestId } })).toBe(2);
  });
  it('shows the same live listings to every player and scopes personal listings', async () => {
    const sale = await listing();
    const [owner, other, mine] = await Promise.all([
      service.list(users[0].id, { page: 1, view: 'market' }),
      service.list(users[1].id, { page: 1, view: 'market' }),
      service.list(users[1].id, { page: 1, view: 'mine' }),
    ]);
    expect(owner.listings.some((entry) => entry.id === sale.requestId && entry.isMine)).toBe(true);
    expect(other.listings.some((entry) => entry.id === sale.requestId && !entry.isMine)).toBe(true);
    expect(mine.listings).toHaveLength(0);
    await prisma.auctionListing.update({
      where: { id: sale.requestId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(
      (await service.list(users[1].id, { page: 1, view: 'market' })).listings.some(
        (entry) => entry.id === sale.requestId,
      ),
    ).toBe(false);
  });
  it('escrows once across concurrent duplicate listing requests', async () => {
    const entry = await prisma.inventoryItem.create({
      data: { gameProfileId: users[0].profileId, itemId: itemIds[0], quantity: 2, isEquiped: false },
    });
    const request = { requestId: randomUUID(), inventoryItemId: entry.id, quantity: 1, price: 125, durationHours: 1 };
    await Promise.all([service.create(users[0].id, request), service.create(users[0].id, request)]);
    expect(await prisma.auctionListing.count({ where: { id: request.requestId } })).toBe(1);
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: entry.id } })).quantity).toBe(1);
  });
  it('rolls back a purchase with a full backpack or insufficient level', async () => {
    const sale = await listing();
    await fill(users[1].profileId);
    await expect(service.buy(users[1].id, sale.requestId)).rejects.toThrow('Make room');
    await prisma.gameProfile.update({ where: { id: users[2].profileId }, data: { level: 19 } });
    await expect(service.buy(users[2].id, sale.requestId)).rejects.toThrow('level 20');
    expect((await prisma.auctionListing.findUniqueOrThrow({ where: { id: sale.requestId } })).status).toBe('ACTIVE');
    expect((await prisma.gameProfile.findUniqueOrThrow({ where: { id: users[1].profileId } })).gold).toBe(1000);
    expect(await prisma.playerNotification.count({ where: { listingId: sale.requestId } })).toBe(0);
  });
  it('returns expired escrow once, including during concurrent expiry jobs', async () => {
    const sale = await listing();
    await prisma.auctionListing.update({
      where: { id: sale.requestId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await Promise.all([service.expireListing(sale.requestId), service.expireListing(sale.requestId)]);
    expect(await prisma.inventoryItem.count({ where: { gameProfileId: users[0].profileId } })).toBe(1);
    expect((await prisma.auctionListing.findUniqueOrThrow({ where: { id: sale.requestId } })).status).toBe('RETURNED');
  });
  it('holds full-bag returns, denies other players and prevents double claims', async () => {
    const sale = await listing();
    await fill(users[0].profileId);
    await prisma.auctionListing.update({
      where: { id: sale.requestId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await service.expireListing(sale.requestId);
    const note = await prisma.playerNotification.findFirstOrThrow({ where: { listingId: sale.requestId } });
    await expect(service.claim(users[1].id, note.id)).rejects.toThrow('not found');
    await expect(service.claim(users[0].id, note.id)).rejects.toThrow('full');
    const slot = await prisma.inventoryItem.findFirstOrThrow({ where: { gameProfileId: users[0].profileId } });
    await prisma.inventoryItem.delete({ where: { id: slot.id } });
    const claims = await Promise.allSettled([service.claim(users[0].id, note.id), service.claim(users[0].id, note.id)]);
    expect(claims.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.inventoryItem.count({ where: { gameProfileId: users[0].profileId } })).toBe(24);
    expect(await prisma.inventoryItem.count({ where: { gameProfileId: users[0].profileId, upgradeValue: 11 } })).toBe(
      1,
    );
  });
  it('denies claims at the deadline without relying on cron timing', async () => {
    const sale = await listing();
    await fill(users[0].profileId);
    await prisma.auctionListing.update({
      where: { id: sale.requestId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await service.expireListing(sale.requestId);
    const note = await prisma.playerNotification.findFirstOrThrow({ where: { listingId: sale.requestId } });
    await prisma.auctionListing.update({
      where: { id: sale.requestId },
      data: { claimExpiresAt: new Date(Date.now() - 1000) },
    });
    await expect(service.claim(users[0].id, note.id)).rejects.toThrow('no longer');
  });
});
