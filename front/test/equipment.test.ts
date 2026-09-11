import { describe, expect, it } from 'vitest';

import type { InventoryItemType } from '@/modules/Inventory/types';

import { findEquippedEntryForTypes, getCompatibleEquipmentSlots } from '@/modules/Inventory/utils/equipment';

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
});
