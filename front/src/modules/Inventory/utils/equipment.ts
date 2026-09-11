import type { EquipmentSlotId, EquipmentType, InventoryItemType } from '@/modules/Inventory/types';

const EQUIPMENT_TYPE_SLOTS: Record<EquipmentType, EquipmentSlotId[]> = {
  WEAPON: ['left-hand', 'right-hand'],
  SHIELD: ['right-hand', 'left-hand'],
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

export const getCompatibleEquipmentSlots = (item: InventoryItemType): EquipmentSlotId[] => {
  return getCompatibleEquipmentSlotsForTypes(item.equipmentType ?? item.equipmentTypes ?? []);
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
