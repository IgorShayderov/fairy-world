import { describe, expect, it } from 'vitest';

import type { EquipmentSlotId, EquipmentType, InventoryEntry, ItemRarity } from '@/modules/Inventory/types';

import { getBattlePlayerLoadout } from '@/modules/Game/battlePlayerLoadout';

const equipped = (
  id: number,
  name: string,
  equipmentType: EquipmentType[],
  slot: EquipmentSlotId,
  options: { isTwoHanded?: boolean; rarity?: ItemRarity } = {},
): InventoryEntry => ({
  id,
  item: {
    id,
    name,
    description: '',
    price: 1,
    icon: name.includes('Shield')
      ? 'icon_shield.png'
      : name.includes('Axe')
        ? 'icon_axe.png'
        : 'icon_sword.png',
    rarity: options.rarity ?? 'COMMON',
    equipmentType,
    ...(options.isTwoHanded === undefined ? {} : { isTwoHanded: options.isTwoHanded }),
    attributes: [],
    properties: [],
  },
  quantity: 1,
  slot,
  isEquiped: true,
});

describe('battle player loadout', () => {
  it('reads the equipped-items collection returned separately from the backpack', () => {
    const currentUser = {
      inventory: [],
      equippedItems: [equipped(1, 'Sword', ['WEAPON'], 'left-hand')],
    };
    expect(getBattlePlayerLoadout(currentUser.equippedItems)).toMatchObject({
      handMode: 'SINGLE',
      primaryIcon: '/icons/items/icon_sword.png',
    });
  });

  it('uses the two-handed rig and suppresses a shield', () => {
    const loadout = getBattlePlayerLoadout([
      equipped(1, 'Two-handed Sword', ['WEAPON'], 'left-hand', { isTwoHanded: true }),
      equipped(2, 'Shield', ['SHIELD'], 'right-hand'),
    ]);
    expect(loadout.handMode).toBe('TWO_HANDED');
    expect(loadout.primaryWeapon).toBe('SWORD');
    expect(loadout.primaryIcon).toBe('/icons/items/icon_sword.png');
    expect(loadout.shieldIcon).toBe('/icons/items/icon_shield.png');
  });

  it('distinguishes sword and shield, a single axe, and dual weapons', () => {
    const sword = equipped(1, 'Sword', ['WEAPON'], 'left-hand');
    const shield = equipped(2, 'Shield', ['SHIELD'], 'right-hand');
    expect(getBattlePlayerLoadout([sword, shield]).handMode).toBe('WEAPON_SHIELD');
    expect(getBattlePlayerLoadout([equipped(3, 'Axe', ['WEAPON'], 'left-hand')])).toMatchObject({
      handMode: 'SINGLE',
      primaryWeapon: 'AXE',
    });
    expect(
      getBattlePlayerLoadout([equipped(4, 'Dagger', ['WEAPON'], 'right-hand'), sword]),
    ).toMatchObject({ handMode: 'DUAL', secondaryWeapon: 'DAGGER' });
  });

  it('reflects equipped helmet, body armour, and highest visible rarity', () => {
    const loadout = getBattlePlayerLoadout([
      equipped(1, 'Helmet', ['HELMET'], 'head'),
      equipped(2, 'Armor', ['BODY'], 'body', { rarity: 'UNIQUE' }),
    ]);
    expect(loadout).toMatchObject({ hasHelmet: true, hasBodyArmor: true, accent: '#f2c75c' });
  });
});
