import type { InventoryItemType } from '@/modules/Inventory/types';

export const isPotion = (item: InventoryItemType): boolean =>
  (item.equipmentType ?? item.equipmentTypes ?? []).includes('POTION');

export const isHealthPotion = (item: InventoryItemType): boolean =>
  isPotion(item) && (item.name ?? item.nameKey).includes('Health Potion');

export const POTION_REQUIRED_LEVELS: Record<string, number> = {
  'Lesser Experience Potion': 10,
  'Lesser Attack Potion': 10,
  'Lesser Defense Potion': 10,

  'Medium Experience Potion': 20,
  'Medium Attack Potion': 20,
  'Medium Defense Potion': 20,
  'Moderate Experience Potion': 20,
  'Moderate Attack Potion': 20,
  'Moderate Defense Potion': 20,

  'Mild Experience Potion': 30,
  'Mild Attack Potion': 30,
  'Mild Defense Potion': 30,
  'Free Attribute Potion': 30,

  'Greater Experience Potion': 40,
  'Greater Attack Potion': 40,
  'Greater Defense Potion': 40,

  'Higher Experience Potion': 50,
  'Higher Attack Potion': 50,
  'Higher Defense Potion': 50,
};

export const getPotionRequiredLevel = (name?: string): number =>
  (name ? POTION_REQUIRED_LEVELS[name] ?? 1 : 1);
