import type { InventoryItemType } from '@/modules/Inventory/types';

const RANGED_IMAGES = {
  crossbow: 'icon_crossbow.svg',
  bow: 'icon_bow.svg',
  arrows: 'icon_arrows.svg',
  bolts: 'icon_bolts.svg',
} as const;

/** Resolve explicit assets first, with a fallback for older item records. */
export function rangedItemImage(item: InventoryItemType | null | undefined): string | undefined {
  if (!item) return undefined;
  for (const filename of Object.values(RANGED_IMAGES)) {
    if (item.icon === filename || item.icon === `/icons/items/${filename}`) return `/icons/items/${filename}`;
  }
  const name = [item.nameKey, item.name, item.tooltipName].filter(Boolean).join(' ');
  for (const [kind, filename] of Object.entries(RANGED_IMAGES)) {
    if (new RegExp(`\\b${kind}\\b`, 'i').test(name)) return `/icons/items/${filename}`;
  }
  return undefined;
}
