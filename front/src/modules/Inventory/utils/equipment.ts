import type { EquipmentSlot, EquipmentSlotId, EquipmentType, InventoryItemType, InventoryEntry } from '@/modules/Inventory/types';

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

export const isTwoHanded = (item?: { name?: string; nameKey?: string; isTwoHanded?: boolean } | null): boolean => {
  if (!item) return false;
  if (typeof item.isTwoHanded === 'boolean') return item.isTwoHanded;
  return Boolean(
    item.name?.toLowerCase().includes('two-handed') ||
    item.nameKey?.toLowerCase().includes('two-handed')
  );
};

export const getCompatibleEquipmentSlots = (item: InventoryItemType): EquipmentSlotId[] => {
  if (isPotion(item) && !isHealthPotion(item)) return [];
  if (isTwoHanded(item)) return ['left-hand'];
  return getCompatibleEquipmentSlotsForTypes(item.equipmentType ?? item.equipmentTypes ?? []);
};

export const combineEquippedHandItems = (
  leftItem: InventoryItemType | null | undefined,
  rightItem: InventoryItemType | null | undefined,
): InventoryItemType | null => {
  if (!leftItem && !rightItem) return null;
  if (leftItem && !rightItem) return leftItem;
  if (!leftItem && rightItem) return rightItem;

  const left = leftItem!;
  const right = rightItem!;

  const attributeMap = new Map<string, number>();
  for (const attr of [...(left.attributes ?? []), ...(right.attributes ?? [])]) {
    attributeMap.set(attr.name, (attributeMap.get(attr.name) ?? 0) + attr.value);
  }
  const attributes = [...attributeMap.entries()].map(([name, value]) => ({
    name,
    description: null,
    value,
  }));

  const propertyMap = new Map<string, number>();
  for (const prop of [...(left.properties ?? []), ...(right.properties ?? [])]) {
    propertyMap.set(prop.name, (propertyMap.get(prop.name) ?? 0) + prop.value);
  }
  const properties = [...propertyMap.entries()].map(([name, value]) => ({
    name,
    description: null,
    value,
  }));

  const leftName = left.tooltipName ?? left.name ?? left.nameKey;
  const rightName = right.tooltipName ?? right.name ?? right.nameKey;
  const combinedName = `${leftName} + ${rightName}`;

  return {
    nameKey: combinedName,
    name: combinedName,
    tooltipName: combinedName,
    icon: left.icon || right.icon || '',
    price: (left.price ?? 0) + (right.price ?? 0),
    rarity: left.rarity === right.rarity ? left.rarity : undefined,
    rarityKey: left.rarityKey === right.rarityKey ? left.rarityKey : undefined,
    equipmentType: ['WEAPON'],
    attributes,
    properties,
    comparisonItems: [left, right],
  };
};

export const findEquippedItemForInventoryItem = (
  equipmentSlots: readonly Pick<EquipmentSlot, 'id' | 'item'>[],
  inventoryItem: InventoryItemType,
): InventoryItemType | null => {
  if (isPotion(inventoryItem)) return null;
  if (isTwoHanded(inventoryItem)) {
    const leftHand = equipmentSlots.find(({ id }) => id === 'left-hand')?.item ?? null;
    const rightHand = equipmentSlots.find(({ id }) => id === 'right-hand')?.item ?? null;
    return combineEquippedHandItems(leftHand, rightHand);
  }
  const compatibleSlots = getCompatibleEquipmentSlots(inventoryItem);
  const equippedItem = equipmentSlots.find(({ id, item }) => item && compatibleSlots.includes(id))?.item ?? null;
  if (equippedItem) return equippedItem;

  if (compatibleSlots.includes('right-hand')) {
    const leftHand = equipmentSlots.find(({ id }) => id === 'left-hand')?.item ?? null;
    if (leftHand && isTwoHanded(leftHand)) {
      return leftHand;
    }
  }

  return null;
};

export const mapInventoryEntryToInventoryItem = (
  entry: InventoryEntry,
  nameFormatter?: (entry: InventoryEntry) => string,
  rarityFormatter?: (rarity: string) => string,
): InventoryItemType => ({
  inventoryItemId: entry.id,
  id: entry.item.id,
  level: entry.item.level ?? 1,
  requiredPlayerLevel: entry.item.requiredPlayerLevel ?? 1,
  nameKey: entry.item.name,
  name: nameFormatter ? nameFormatter(entry) : entry.item.name,
  tooltipName: entry.item.name,
  icon: entry.item.icon,
  description: entry.item.description,
  price: entry.item.price,
  rarity: rarityFormatter ? rarityFormatter(entry.item.rarity) : entry.item.rarity,
  rarityKey: entry.item.rarity,
  equipmentType: entry.item.equipmentType,
  isTwoHanded: isTwoHanded(entry.item),
  attributes: entry.item.attributes,
  properties: entry.item.properties,
  quantity: entry.quantity,
  slot: entry.slot,
});

export const findEquippedItemForEntries = (
  equippedEntries: readonly InventoryEntry[],
  targetItem: { equipmentType?: EquipmentType[]; equipmentTypes?: EquipmentType[]; name?: string; isTwoHanded?: boolean },
  nameFormatter?: (entry: InventoryEntry) => string,
  rarityFormatter?: (rarity: string) => string,
): InventoryItemType | null => {
  const mapEntry = (entry: InventoryEntry): InventoryItemType =>
    mapInventoryEntryToInventoryItem(entry, nameFormatter, rarityFormatter);

  if (isTwoHanded(targetItem)) {
    const leftEntry = equippedEntries.find((entry) => entry.slot === 'left-hand');
    const rightEntry = equippedEntries.find((entry) => entry.slot === 'right-hand');
    const leftItem = leftEntry ? mapEntry(leftEntry) : null;
    const rightItem = rightEntry ? mapEntry(rightEntry) : null;
    return combineEquippedHandItems(leftItem, rightItem);
  }

  const types = targetItem.equipmentType ?? targetItem.equipmentTypes ?? [];
  const equipped = findEquippedEntryForTypes(equippedEntries, types);
  if (equipped) return mapEntry(equipped);

  const compatibleSlots = getCompatibleEquipmentSlotsForTypes(types);
  if (compatibleSlots.includes('right-hand')) {
    const leftEntry = equippedEntries.find((entry) => entry.slot === 'left-hand');
    if (leftEntry && isTwoHanded(leftEntry.item)) {
      return mapEntry(leftEntry);
    }
  }

  return null;
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
