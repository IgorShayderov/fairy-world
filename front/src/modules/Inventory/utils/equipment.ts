import type { EquipmentSlot, EquipmentSlotId, EquipmentType, InventoryItemType } from '@/modules/Inventory/types';

import { isHealthPotion, isPotion } from './potions';

const EQUIPMENT_TYPE_SLOTS: Record<EquipmentType, EquipmentSlotId[]> = {
  WEAPON: ['left-hand', 'right-hand'],
  SHIELD: ['right-hand'],
  BODY: ['body'],
  HELMET: ['head'],
  BOOTS: ['feet'],
  GLOVES: ['hands'],
  LEGS: ['legs'],
  RING: ['accessory'],
  AMULET: ['accessory'],
  SCROLL: ['scroll'],
  POTION: ['potion'],
  UNKNOWN: [],
};

export const getCompatibleEquipmentSlotsForTypes = (equipmentTypes: EquipmentType[]): EquipmentSlotId[] => {
  const slots = new Set<EquipmentSlotId>();
  for (const type of equipmentTypes) {
    for (const slot of EQUIPMENT_TYPE_SLOTS[type]) slots.add(slot);
  }
  return [...slots];
};

export const isTwoHanded = (item?: { name?: string; isTwoHanded?: boolean } | null): boolean => {
  if (!item) return false;
  return item.isTwoHanded ?? item.name?.toLowerCase().includes('two-handed') ?? false;
};

export const getCompatibleEquipmentSlots = (item: InventoryItemType): EquipmentSlotId[] => {
  if (isPotion(item) && !isHealthPotion(item)) return [];
  if (isTwoHanded(item)) return ['left-hand'];
  return getCompatibleEquipmentSlotsForTypes(item.equipmentType ?? item.equipmentTypes ?? []);
};

export const findEquippedItemForInventoryItem = (
  equipmentSlots: readonly Pick<EquipmentSlot, 'id' | 'item'>[],
  inventoryItem: InventoryItemType,
): InventoryItemType | null => {
  if (isPotion(inventoryItem)) return null;
  const compatibleSlots = getCompatibleEquipmentSlots(inventoryItem);
  return equipmentSlots.find(({ id, item }) => item && compatibleSlots.includes(id))?.item ?? null;
};

export const findEquippedEntryForTypes = <T extends { slot: EquipmentSlotId | null }>(
  equippedEntries: readonly T[],
  equipmentTypes: EquipmentType[]
): T | undefined => {
  for (const slot of getCompatibleEquipmentSlotsForTypes(equipmentTypes)) {
    const equippedEntry = equippedEntries.find((entry) => entry.slot === slot);
    if (equippedEntry) return equippedEntry;
  }

  return undefined;
};
