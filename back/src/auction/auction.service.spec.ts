import { AuctionService, AUCTION_RETURN_MS } from './auction.service';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/client';

describe('AuctionService', () => {
  const tx = {
    gameProfile: { findUnique: jest.fn(), updateMany: jest.fn() },
    inventoryItem: { findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    auctionListing: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    playerNotification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = { ...tx, $transaction: jest.fn() };
  const service = new AuctionService(prisma as unknown as PrismaService);
  const input = {
    requestId: '00000000-0000-4000-8000-000000000001',
    inventoryItemId: 5,
    price: 125,
    durationHours: 6,
    quantity: 1,
  };
  const now = new Date('2026-10-18T12:00:00Z');
  const item = {
    id: 8,
    name: 'Rare Crossbow',
    level: 13,
    isConsumable: false,
    equipmentType: ['WEAPON'],
    rarity: 'RARE',
  };
  const listing = {
    id: input.requestId,
    sellerId: 1,
    buyerId: null,
    itemId: 8,
    item,
    price: 125,
    quantity: 1,
    upgradeType: 'DAMAGE',
    upgradeValue: 7,
    status: 'ACTIVE',
    expiresAt: new Date(now.getTime() + 3600000),
    claimExpiresAt: null,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    prisma.$transaction.mockImplementation((operation: (client: typeof tx) => Promise<unknown>) => operation(tx));
    tx.gameProfile.findUnique.mockResolvedValue({ id: 2, gold: 500, level: 10, mapPositionX: 1470, mapPositionY: 960 });
    tx.gameProfile.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryItem.findFirst.mockResolvedValue(null);
    tx.inventoryItem.count.mockResolvedValue(0);
    tx.auctionListing.findUnique.mockResolvedValue(listing);
    tx.auctionListing.count.mockResolvedValue(0);
    tx.auctionListing.findMany.mockResolvedValue([]);
  });
  afterEach(() => jest.useRealTimers());

  it.each([
    { mapPositionX: 0, mapPositionY: 0 },
    { mapPositionX: 1200, mapPositionY: 330 },
    { mapPositionX: 1770, mapPositionY: 300 },
    { mapPositionX: 1541, mapPositionY: 960 },
  ])('blocks browsing, listing and buying outside towns at %j', async (position) => {
    tx.gameProfile.findUnique.mockResolvedValue({ id: 2, gold: 500, level: 10, ...position });
    await expect(service.list(11, { page: 1, view: 'market' })).rejects.toThrow('Visit a town');
    await expect(service.list(11, { page: 1, view: 'mine' })).rejects.toThrow('Visit a town');
    await expect(service.create(11, input)).rejects.toThrow('Visit a town');
    await expect(service.buy(11, listing.id)).rejects.toThrow('Visit a town');
    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
    expect(tx.inventoryItem.delete).not.toHaveBeenCalled();
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
  });

  it('allows buying at the same town boundary as the shop', async () => {
    tx.gameProfile.findUnique.mockResolvedValue({ id: 2, gold: 500, level: 10, mapPositionX: 1540, mapPositionY: 960 });
    await expect(service.buy(11, listing.id)).resolves.toEqual({ success: true });
  });

  it('escrows the exact upgraded inventory entry and selected quantity', async () => {
    tx.auctionListing.findUnique.mockResolvedValue(null);
    tx.inventoryItem.findFirst.mockResolvedValue({
      id: 5,
      itemId: 8,
      quantity: 3,
      upgradeType: 'DAMAGE',
      upgradeValue: 7,
      item,
    });
    await service.create(11, input);
    expect(tx.inventoryItem.findFirst).toHaveBeenCalledWith({
      where: { id: 5, gameProfileId: 2, isEquiped: false },
      include: { item: true },
    });
    expect(tx.auctionListing.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sellerId: 2,
        quantity: 1,
        price: 125,
        upgradeType: 'DAMAGE',
        upgradeValue: 7,
        expiresAt: new Date(now.getTime() + 6 * 3600000),
      }) as unknown,
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { quantity: { decrement: 1 } } });
  });
  it('deletes a fully escrowed stack and rejects equipped or foreign entries', async () => {
    tx.auctionListing.findUnique.mockResolvedValue(null);
    await expect(service.create(11, input)).rejects.toThrow('unequipped');
    tx.inventoryItem.findFirst.mockResolvedValue({ id: 5, itemId: 8, quantity: 1, item });
    await service.create(11, input);
    expect(tx.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });
  it('does not escrow twice when a request is retried', async () => {
    tx.auctionListing.findUnique.mockResolvedValue({ ...listing, sellerId: 2 });
    await service.create(11, input);
    expect(tx.inventoryItem.delete).not.toHaveBeenCalled();
    expect(tx.auctionListing.create).not.toHaveBeenCalled();
  });
  it.each([
    { price: 0 },
    { price: -10 },
    { price: 1.5 },
    { price: 2147483648 },
    { durationHours: 0 },
    { durationHours: 25 },
    { durationHours: 1.5 },
    { quantity: 0 },
    { quantity: 1.1 },
  ])('rejects invalid listing fields %j', async (change) => {
    await expect(service.create(11, { ...input, ...change })).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects quest items and excess listings', async () => {
    tx.auctionListing.findUnique.mockResolvedValue(null);
    tx.inventoryItem.findFirst.mockResolvedValue({ id: 5, quantity: 1, item: { ...item, rarity: 'QUEST' } });
    await expect(service.create(11, input)).rejects.toThrow('Quest');
    tx.inventoryItem.findFirst.mockResolvedValue({ id: 5, quantity: 1, item });
    tx.auctionListing.count.mockResolvedValue(24);
    await expect(service.create(11, input)).rejects.toThrow('24 active');
  });
  it('uses the same wearable-level threshold as equipment and transfers exact gold', async () => {
    await service.buy(11, listing.id);
    expect(tx.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 2, gold: { gte: 125 } },
      data: { gold: { decrement: 125 } },
    });
    expect(tx.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 1, gold: { lte: 2147483522 } },
      data: { gold: { increment: 125 } },
    });
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: {
        gameProfileId: 2,
        itemId: 8,
        quantity: 1,
        upgradeType: 'DAMAGE',
        upgradeValue: 7,
        slot: null,
        isEquiped: false,
      },
    });
    expect(tx.auctionListing.update).toHaveBeenCalledWith({
      where: { id: listing.id },
      data: { status: 'SOLD', buyerId: 2, completedAt: now },
    });
    expect(tx.playerNotification.createMany).toHaveBeenCalledTimes(1);
  });
  it.each([
    [{ level: 9, gold: 500, id: 2 }, 'level 10'],
    [{ level: 10, gold: 100, id: 2 }, 'Not enough gold'],
    [{ level: 10, gold: 500, id: 1 }, 'own listing'],
  ])('rejects ineligible buyers %j', async (buyer, message) => {
    tx.gameProfile.findUnique.mockResolvedValue({ ...buyer, mapPositionX: 1470, mapPositionY: 960 });
    await expect(service.buy(11, listing.id)).rejects.toThrow(message);
    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
  });
  it.each(['SOLD', 'RETURN_PENDING', 'RETURNED', 'FORFEITED'])('rejects %s listings', async (status) => {
    tx.auctionListing.findUnique.mockResolvedValue({ ...listing, status });
    await expect(service.buy(11, listing.id)).rejects.toThrow('sold or expired');
  });
  it('rejects purchases exactly at expiry even before the cron runs', async () => {
    tx.auctionListing.findUnique.mockResolvedValue({ ...listing, expiresAt: now });
    await expect(service.buy(11, listing.id)).rejects.toThrow('expired');
  });
  it('does not charge the same buyer again after a retried purchase', async () => {
    tx.auctionListing.findUnique.mockResolvedValue({ ...listing, status: 'SOLD', buyerId: 2 });
    await service.buy(11, listing.id);
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a full buyer inventory but merges a matching upgraded stack', async () => {
    tx.inventoryItem.count.mockResolvedValue(24);
    await expect(service.buy(11, listing.id)).rejects.toThrow('Make room');
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
    tx.inventoryItem.findFirst.mockResolvedValue({ id: 99, quantity: 1 });
    await service.buy(11, listing.id);
    expect(tx.inventoryItem.findFirst).toHaveBeenLastCalledWith({
      where: { gameProfileId: 2, itemId: 8, isEquiped: false, upgradeType: 'DAMAGE', upgradeValue: 7 },
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({ where: { id: 99 }, data: { quantity: { increment: 1 } } });
  });
  it('returns unsold items once without any gold changes', async () => {
    tx.auctionListing.findUnique.mockResolvedValue({ ...listing, expiresAt: now });
    await service.expireListing(listing.id);
    expect(tx.auctionListing.update).toHaveBeenCalledWith({
      where: { id: listing.id },
      data: { status: 'RETURNED', completedAt: now, claimExpiresAt: null },
    });
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ gameProfileId: 1, upgradeValue: 7 }) as unknown,
    });
    expect(tx.gameProfile.updateMany).not.toHaveBeenCalled();
    tx.auctionListing.findUnique.mockResolvedValue({ ...listing, status: 'RETURNED' });
    await service.expireListing(listing.id);
    expect(tx.inventoryItem.create).toHaveBeenCalledTimes(1);
  });
  it('holds a return for seven days when the backpack is full', async () => {
    tx.inventoryItem.count.mockResolvedValue(24);
    tx.auctionListing.findUnique.mockResolvedValue({ ...listing, expiresAt: now });
    await service.expireListing(listing.id);
    expect(tx.auctionListing.update).toHaveBeenCalledWith({
      where: { id: listing.id },
      data: { status: 'RETURN_PENDING', completedAt: now, claimExpiresAt: new Date(now.getTime() + AUCTION_RETURN_MS) },
    });
    expect(tx.playerNotification.create).toHaveBeenCalledWith({
      data: { gameProfileId: 1, listingId: listing.id, kind: 'AUCTION_RETURN_PENDING' },
    });
  });
  it('claims only owned, live returns and keeps the upgrade', async () => {
    tx.gameProfile.findUnique.mockResolvedValue({ id: 2, gold: 500, level: 10, mapPositionX: 0, mapPositionY: 0 });
    tx.playerNotification.findFirst.mockResolvedValue({
      listing: { ...listing, sellerId: 2, status: 'RETURN_PENDING', claimExpiresAt: new Date(now.getTime() + 10000) },
    });
    await service.claim(11, 'note');
    expect(tx.playerNotification.findFirst).toHaveBeenCalledWith({
      where: { id: 'note', gameProfileId: 2 },
      include: { listing: true },
    });
    expect(tx.playerNotification.update).toHaveBeenCalledWith({
      where: { id: 'note' },
      data: { kind: 'AUCTION_RETURNED', readAt: now },
    });
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ upgradeType: 'DAMAGE', upgradeValue: 7 }) as unknown,
    });
  });
  it('refuses expired, foreign and missing claims, and does not consume a claim when full', async () => {
    await expect(service.claim(11, 'note')).rejects.toThrow('not found');
    tx.playerNotification.findFirst.mockResolvedValue({
      listing: { ...listing, sellerId: 2, status: 'RETURN_PENDING', claimExpiresAt: now },
    });
    await expect(service.claim(11, 'note')).rejects.toThrow('no longer');
    tx.playerNotification.findFirst.mockResolvedValue({
      listing: { ...listing, sellerId: 1, status: 'RETURN_PENDING', claimExpiresAt: new Date(now.getTime() + 10000) },
    });
    await expect(service.claim(11, 'note')).rejects.toThrow('no longer');
    tx.playerNotification.findFirst.mockResolvedValue({
      listing: { ...listing, sellerId: 2, status: 'RETURN_PENDING', claimExpiresAt: new Date(now.getTime() + 10000) },
    });
    tx.inventoryItem.count.mockResolvedValue(24);
    await expect(service.claim(11, 'note')).rejects.toThrow('full');
    expect(tx.auctionListing.update).not.toHaveBeenCalled();
  });
  it('retries serializable conflicts without weakening isolation', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: '7' }),
    );
    await service.buy(11, listing.id);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('expires pending claims even when the player is offline', async () => {
    await service.expireAuctions();
    expect(tx.playerNotification.updateMany).toHaveBeenCalledWith({
      where: { listing: { status: 'RETURN_PENDING', claimExpiresAt: { lte: now } }, kind: 'AUCTION_RETURN_PENDING' },
      data: { kind: 'AUCTION_RETURN_EXPIRED', readAt: null },
    });
    expect(tx.auctionListing.updateMany).toHaveBeenCalledWith({
      where: { status: 'RETURN_PENDING', claimExpiresAt: { lte: now } },
      data: { status: 'FORFEITED', completedAt: now },
    });
  });
});
