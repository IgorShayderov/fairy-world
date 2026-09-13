import { mkdirSync, writeFileSync } from 'node:fs';
import { PrismaService } from '../src/prisma.service';
import { itemIdentity } from '../src/items/item-identity';

async function main() {
  const prisma = new PrismaService();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7241901)`;
      await tx.$executeRaw`LOCK TABLE "Item", "InventoryItem", "ShopStock", "ItemStat", "ItemAttribute" IN SHARE ROW EXCLUSIVE MODE`;
      const items = await tx.item.findMany({
        include: { stats: { include: { stat: true } }, attributes: { include: { attribute: true } } },
        orderBy: { id: 'asc' },
      });
      const canonical = new Map<string, number>();
      const duplicates: Array<{ id: number; canonicalId: number }> = [];
      for (const item of items) {
        const key = itemIdentity(item);
        const id = canonical.get(key);
        if (id === undefined) canonical.set(key, item.id);
        else duplicates.push({ id: item.id, canonicalId: id });
      }
      console.log(JSON.stringify({ items: items.length, duplicates: duplicates.length, apply: process.argv.includes('--apply') }));
      if (!duplicates.length || !process.argv.includes('--apply')) return;
      const stockBefore = await tx.shopStock.aggregate({ _sum: { quantity: true } });
      const inventoryBefore = await tx.inventoryItem.aggregate({ _sum: { quantity: true }, _count: true });
      const ids = duplicates.map(({ id }) => id);
      const inventory = await tx.inventoryItem.findMany({ where: { itemId: { in: ids } } });
      const stock = await tx.shopStock.findMany({ where: { itemId: { in: [...ids, ...duplicates.map(({ canonicalId }) => canonicalId)] } } });
      mkdirSync('backups', { recursive: true });
      const backupPath = `backups/item-dedup-${Date.now()}.json`;
      writeFileSync(backupPath, JSON.stringify({ duplicates, items: items.filter(({ id }) => ids.includes(id)), inventory, stock }, null, 2), { mode: 0o600 });
      for (const { id, canonicalId } of duplicates) {
        // Preserve inventory row IDs, quantities and equipped slots.
        await tx.inventoryItem.updateMany({ where: { itemId: id }, data: { itemId: canonicalId } });
        for (const entry of stock.filter(({ itemId }) => itemId === id)) {
          await tx.shopStock.upsert({
            where: { shopId_itemId: { shopId: entry.shopId, itemId: canonicalId } },
            create: { shopId: entry.shopId, itemId: canonicalId, quantity: entry.quantity },
            update: { quantity: { increment: entry.quantity } },
          });
        }
        await tx.item.delete({ where: { id } });
      }
      const stockAfter = await tx.shopStock.aggregate({ _sum: { quantity: true } });
      const inventoryAfter = await tx.inventoryItem.aggregate({ _sum: { quantity: true }, _count: true });
      if (JSON.stringify(stockBefore) !== JSON.stringify(stockAfter) || JSON.stringify(inventoryBefore) !== JSON.stringify(inventoryAfter)) {
        throw new Error('Quantity verification failed; rolling back the merge');
      }
      console.log(`Merged ${duplicates.length} duplicate items. Recovery snapshot: ${backupPath}`);
    }, { timeout: 120_000 });
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
