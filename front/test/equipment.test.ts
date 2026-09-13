import { describe, expect, it } from 'vitest';

import type { InventoryItemType } from '@/modules/Inventory/types';

import {
  findEquippedEntryForTypes,
  findEquippedItemForInventoryItem,
  getCompatibleEquipmentSlots,
} from '@/modules/Inventory/utils/equipment';

const item = (equipmentType: NonNullable<InventoryItemType['equipmentType']>): InventoryItemType => ({
  nameKey: 'Item',
  icon: '',
  equipmentType,
});

describe('equipment slot selection', () => {
  it('prefers the right hand for shields', () => {
    expect(getCompatibleEquipmentSlots(item(['SHIELD']))).toEqual(['right-hand', 'left-hand']);
  });

  it('returns the matching armor slot', () => {
    expect(getCompatibleEquipmentSlots(item(['HELMET']))).toEqual(['head']);
  });

  it('matches rings and amulets through their shared accessory slot', () => {
    const equippedAmulet = { id: 7, slot: 'accessory' as const };

    expect(findEquippedEntryForTypes([equippedAmulet], ['RING'])).toBe(equippedAmulet);
  });

  it('allows health potions in the potion slot', () => {
    expect(getCompatibleEquipmentSlots({ ...item(['POTION']), name: 'Mild Health Potion' })).toEqual(['potion']);
  });

  it('does not allow buff potions in an equipment slot', () => {
    expect(getCompatibleEquipmentSlots({ ...item(['POTION']), name: 'Mild Attack Potion' })).toEqual([]);
    expect(getCompatibleEquipmentSlots({ ...item(['POTION']), name: 'Higher Experience Potion' })).toEqual([]);
  });

  it('finds comparison equipment for an unequipped profile item', () => {
    const equippedAmulet = { ...item(['AMULET']), name: 'Equipped Amulet' };
    const equipmentSlots = [{ id: 'accessory' as const, item: equippedAmulet }];

    expect(findEquippedItemForInventoryItem(equipmentSlots, item(['RING']))).toBe(equippedAmulet);
    expect(findEquippedItemForInventoryItem(equipmentSlots, item(['HELMET']))).toBeNull();
  });

  it('never compares potions, including health potions', () => {
    const equippedPotion = { ...item(['POTION']), name: 'Mild Health Potion' };
    const equipmentSlots = [{ id: 'potion' as const, item: equippedPotion }];

    expect(
      findEquippedItemForInventoryItem(equipmentSlots, {
        ...item(['POTION']),
        name: 'Higher Health Potion',
      }),
    ).toBeNull();
  });
});
