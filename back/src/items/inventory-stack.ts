import type { InventoryItem, Prisma } from '../../generated/client';

/** Socketed equipment is always an individual item, never a stack. */
export function matchingStack(
  entry: Pick<InventoryItem, 'hasSocket' | 'upgradeType' | 'upgradeValue'>,
): Prisma.InventoryItemWhereInput {
  return entry.hasSocket
    ? { id: -1 }
    : { hasSocket: false, upgradeType: entry.upgradeType ?? null, upgradeValue: entry.upgradeValue ?? null };
}
