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

export const getCompatibleEquipmentSlots = (item: InventoryItemType): EquipmentSlotId[] => {
  const slots = new Set<EquipmentSlotId>();
  for (const type of item.equipmentType ?? item.equipmentTypes ?? []) {
    for (const slot of EQUIPMENT_TYPE_SLOTS[type]) slots.add(slot);
  }
  return [...slots];
};
