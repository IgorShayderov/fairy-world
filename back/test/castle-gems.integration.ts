/** Local database smoke test; cleanup only removes the explicitly tracked fixtures created here. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma.service';
import { CastlesService } from '../src/castles/castles.service';
import { ItemSocketsService } from '../src/locations/item-sockets';
import { AuctionService } from '../src/auction/auction.service';
import { UsersService } from '../src/users/users.service';

async function main() {
  const prisma = new PrismaService();
  let userId: number | undefined, itemId: number | undefined;
  try {
    const user = await prisma.user.create({ data: { email: `gems-test-${randomUUID()}@example.invalid`, name: 'Gem socket smoke test', password: 'disabled-test-login', gameProfile: { create: { level: 25, gold: 50000, gems: 100, mapPositionX: 1490, mapPositionY: 740 } } }, include: { gameProfile: true } });
    userId = user.id;
    const profileId = user.gameProfile!.id;
    const castle = await prisma.castle.create({ data: { profileId, name: 'Test Gem Keep', city: 'AURELIA', x: 1100, y: 770, keep: 9, gemMine: 2, wood: 10000, stone: 10000 } });
    const castles = new CastlesService(prisma), sockets = new ItemSocketsService(prisma), auction = new AuctionService(prisma), users = new UsersService(prisma);
    await castles.startMining(user.id);
    await assert.rejects(() => castles.collectGem(user.id), /not complete/);
    await prisma.castle.update({ where: { id: castle.id }, data: { miningEndsAt: new Date(Date.now() - 1000) } });
    const collections = await Promise.allSettled([castles.collectGem(user.id), castles.collectGem(user.id)]);
    assert.equal(collections.filter((r) => r.status === 'fulfilled').length, 1);
    const gem = await prisma.equipmentGem.findFirstOrThrow({ where: { gameProfileId: profileId } });
    assert.equal(gem.mineLevel, 2);
    const item = await prisma.item.create({ data: { name: `Socket test ${randomUUID()}`, level: 10, equipmentType: ['HELMET'], rarity: 'RARE' } });
    itemId = item.id;
    const entry = await prisma.inventoryItem.create({ data: { gameProfileId: profileId, itemId: item.id, quantity: 1, isEquiped: false, upgradeType: 'HEALTH', upgradeValue: 30 } });
    const prices = (await sockets.offer(user.id)).prices;
    const goldCost = prices.goldPerLevel * 10;
    const additions = await Promise.allSettled([sockets.change(user.id, entry.id, 'add', { expectedCost: goldCost, expectedGemCost: prices.gems }), sockets.change(user.id, entry.id, 'add', { expectedCost: goldCost, expectedGemCost: prices.gems })]);
    assert.equal(additions.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await prisma.gameProfile.findUniqueOrThrow({ where: { id: profileId } })).gold, 50000 - goldCost);
    await sockets.change(user.id, entry.id, 'insert', { expectedCost: 0, expectedGemCost: 0, gemId: gem.id });
    assert.equal(await prisma.equipmentGem.count({ where: { id: gem.id } }), 0);
    await users.equipItem(user.id, { inventoryItemId: entry.id, slot: 'head' });
    // A matching plain item must not swallow the socket on unequip.
    await prisma.inventoryItem.create({ data: { gameProfileId: profileId, itemId: item.id, quantity: 1, isEquiped: false } });
    await users.unequipItem(user.id, 'head');
    const equipped = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: entry.id } });
    assert.equal(equipped.hasSocket, true);
    assert.equal(equipped.socketGemValue, gem.value);
    assert.equal(equipped.upgradeValue, 30);
    await prisma.gameProfile.update({ where: { id: profileId }, data: { mapPositionX: 1470, mapPositionY: 960 } });
    const listing = { requestId: randomUUID(), inventoryItemId: entry.id, price: 500, quantity: 1, durationHours: 1 };
    await assert.rejects(() => auction.create(user.id, listing), /Remove the item socket/);
    await prisma.gameProfile.update({ where: { id: profileId }, data: { mapPositionX: 1490, mapPositionY: 740 } });
    await sockets.change(user.id, entry.id, 'remove', { expectedCost: prices.removalGoldPerLevel * 10, expectedGemCost: 0 });
    const stripped = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: entry.id } });
    assert.equal(stripped.hasSocket, false);
    assert.equal(stripped.socketGemType, null);
    assert.equal(stripped.upgradeValue, 30);
    await prisma.gameProfile.update({ where: { id: profileId }, data: { mapPositionX: 1470, mapPositionY: 960 } });
    await auction.create(user.id, listing);
    console.log('PASS: mining timer, concurrent collection/add, gem insertion, equip/unequip preservation, auction rejection and socket destruction.');
  } finally {
    if (userId !== undefined) await prisma.user.delete({ where: { id: userId } });
    if (itemId !== undefined) await prisma.item.delete({ where: { id: itemId } });
    await prisma.$disconnect();
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
