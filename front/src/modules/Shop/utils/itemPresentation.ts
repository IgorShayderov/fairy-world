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
  UNKNOWN: 'unknown',
};

export const getItemTypeLocaleKey = (equipmentTypes: EquipmentType[]): string => {
  const type = equipmentTypes[0] ?? 'UNKNOWN';
  return `profile.items.${ITEM_TYPE_LOCALE_KEYS[type]}`;
};
