import type { InventoryItemType } from '@/modules/Inventory/types';

export const isPotion = (item: InventoryItemType): boolean =>
  (item.equipmentType ?? item.equipmentTypes ?? []).includes('POTION');

export const isHealthPotion = (item: InventoryItemType): boolean =>
  isPotion(item) && (item.name ?? item.nameKey).includes('Health Potion');
