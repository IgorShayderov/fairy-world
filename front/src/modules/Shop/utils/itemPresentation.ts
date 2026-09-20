import type { EquipmentType } from '@/modules/Inventory/types';

const ITEM_TYPE_LOCALE_KEYS: Record<EquipmentType, string> = {
  WEAPON: 'sword',
  SHIELD: 'shield',
  BODY: 'armor',
  HELMET: 'helmet',
  BOOTS: 'boots',
  GLOVES: 'gloves',
  LEGS: 'legs',
  RING: 'ring',
  AMULET: 'amulet',
  SCROLL: 'scroll',
  POTION: 'potion',
  RECIPE: 'recipe',
  UNKNOWN: 'unknown',
};

export const getItemTypeLocaleKey = (equipmentTypes: EquipmentType[], itemName?: string): string => {
  const name = (itemName ?? '').toLowerCase();
  if (name.includes('axe')) return 'profile.items.axe';
  if (name.includes('two-handed') || name.includes('two handed')) return 'profile.items.twoHandedSword';
  if (name.includes('dagger')) return 'profile.items.dagger';

  const type = equipmentTypes[0] ?? 'UNKNOWN';
  return `profile.items.${ITEM_TYPE_LOCALE_KEYS[type]}`;
};
