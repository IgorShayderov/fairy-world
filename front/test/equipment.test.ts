import { describe, expect, it } from 'vitest';

import type { InventoryItemType } from '@/modules/Inventory/types';

import {
  findEquippedItemForEntries,
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
    expect(getCompatibleEquipmentSlots(item(['SHIELD']))).toEqual(['right-hand']);
  });

  it('restricts two-handed weapons to the left hand', () => {
    expect(
      getCompatibleEquipmentSlots({
        ...item(['WEAPON']),
        name: 'Two-handed Sword',
      })
    ).toEqual(['left-hand']);

    expect(
      getCompatibleEquipmentSlots({
        ...item(['WEAPON']),
        name: 'Deadly Two-handed Sword of Strength',
      })
    ).toEqual(['left-hand']);

    expect(
      getCompatibleEquipmentSlots({
        ...item(['WEAPON']),
        name: 'Iron Sword',
      })
    ).toEqual(['left-hand', 'right-hand']);
  });

  it('returns the matching armor slot', () => {
    expect(getCompatibleEquipmentSlots(item(['HELMET']))).toEqual(['head']);
  });

  it('uses separate slots for rings and amulets', () => {
    expect(getCompatibleEquipmentSlots(item(['RING']))).toEqual(['accessory']);
    expect(getCompatibleEquipmentSlots(item(['AMULET']))).toEqual(['amulet']);
  });

  it('does not allow potions in an equipment slot', () => {
    expect(getCompatibleEquipmentSlots({ ...item(['POTION']), name: 'Mild Health Potion' })).toEqual([]);
    expect(getCompatibleEquipmentSlots({ ...item(['POTION']), name: 'Mild Attack Potion' })).toEqual([]);
    expect(getCompatibleEquipmentSlots({ ...item(['POTION']), name: 'Higher Experience Potion' })).toEqual([]);
  });

  it('finds comparison equipment for an unequipped profile item', () => {
    const equippedAmulet = { ...item(['AMULET']), name: 'Equipped Amulet' };
    const equipmentSlots = [{ id: 'amulet' as const, item: equippedAmulet }];

    expect(findEquippedItemForInventoryItem(equipmentSlots, item(['AMULET']))).toBe(equippedAmulet);
    expect(findEquippedItemForInventoryItem(equipmentSlots, item(['RING']))).toBeNull();
    expect(findEquippedItemForInventoryItem(equipmentSlots, item(['HELMET']))).toBeNull();
  });

  it('never compares potions, including health potions', () => {
    const equippedPotion = { ...item(['POTION']), name: 'Mild Health Potion' };
    const equipmentSlots = [{ id: 'banner' as const, item: equippedPotion }];

    expect(
      findEquippedItemForInventoryItem(equipmentSlots, {
        ...item(['POTION']),
        name: 'Higher Health Potion',
      })
    ).toBeNull();
  });

  it('combines items in both hands when comparing a two-handed weapon', () => {
    const leftWeapon = {
      ...item(['WEAPON']),
      name: 'Iron Sword',
      attributes: [{ name: 'STRENGTH' as const, description: null, value: 10 }],
      properties: [{ name: 'DAMAGE' as const, description: null, value: 20 }],
    };
    const rightShield = {
      ...item(['SHIELD']),
      name: 'Wooden Shield',
      attributes: [
        { name: 'STRENGTH' as const, description: null, value: 2 },
        { name: 'ENDURANCE' as const, description: null, value: 5 },
      ],
      properties: [{ name: 'DEFENSE' as const, description: null, value: 15 }],
    };
    const equipmentSlots = [
      { id: 'left-hand' as const, item: leftWeapon },
      { id: 'right-hand' as const, item: rightShield },
    ];

    const twoHandedSword = {
      ...item(['WEAPON']),
      name: 'Two-handed Sword',
    };

    const comparison = findEquippedItemForInventoryItem(equipmentSlots, twoHandedSword);
    expect(comparison).not.toBeNull();
    expect(comparison?.name).toBe('Iron Sword + Wooden Shield');
    expect(comparison?.attributes).toEqual([
      { name: 'STRENGTH', description: null, value: 12 },
      { name: 'ENDURANCE', description: null, value: 5 },
    ]);
    expect(comparison?.properties).toEqual([
      { name: 'DAMAGE', description: null, value: 20 },
      { name: 'DEFENSE', description: null, value: 15 },
    ]);
  });

  it('compares with the two-handed weapon when hovering on a shield with a two-handed weapon equipped', () => {
    const twoHandedSword = {
      ...item(['WEAPON']),
      name: 'Two-handed Sword',
      isTwoHanded: true,
      attributes: [{ name: 'STRENGTH' as const, description: null, value: 15 }],
    };
    const equipmentSlots = [
      { id: 'left-hand' as const, item: twoHandedSword },
      { id: 'right-hand' as const, item: null },
    ];

    const shield = item(['SHIELD']);
    expect(findEquippedItemForInventoryItem(equipmentSlots, shield)).toBe(twoHandedSword);
  });

  it('does not compare with a one-handed weapon when hovering on a shield if right hand is empty', () => {
    const oneHandedSword = {
      ...item(['WEAPON']),
      name: 'Iron Sword',
      isTwoHanded: false,
    };
    const equipmentSlots = [
      { id: 'left-hand' as const, item: oneHandedSword },
      { id: 'right-hand' as const, item: null },
    ];

    const shield = item(['SHIELD']);
    expect(findEquippedItemForInventoryItem(equipmentSlots, shield)).toBeNull();
  });

  it('finds comparison for shield with two-handed weapon equipped using findEquippedItemForEntries', () => {
    const twoHandedSword = {
      id: 1,
      slot: 'left-hand' as const,
      item: {
        id: 1,
        name: 'Two-handed Sword',
        description: '',
        price: 100,
        icon: '',
        rarity: 'COMMON' as const,
        equipmentType: ['WEAPON' as const],
        isTwoHanded: true,
        attributes: [{ name: 'STRENGTH' as const, description: null, value: 20 }],
        properties: [{ name: 'DAMAGE' as const, description: null, value: 50 }],
      },
      quantity: 1,
      isEquiped: true,
    };
    const equippedEntries = [twoHandedSword];

    const result = findEquippedItemForEntries(
      equippedEntries,
      { equipmentType: ['SHIELD'] },
      (entry) => entry.item.name
    );

    expect(result).not.toBeNull();
    expect(result?.nameKey).toBe('Two-handed Sword');
    expect(result?.name).toBe('Two-handed Sword');
    expect(result?.attributes).toEqual([{ name: 'STRENGTH', description: null, value: 20 }]);
    expect(result?.properties).toEqual([{ name: 'DAMAGE', description: null, value: 50 }]);
  });
});
