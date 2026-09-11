import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { InventoryEntry } from '@/modules/Inventory/types';

import { useInventoryStore } from '@/modules/Inventory/store/inventory';

describe('profile inventory hydration', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('maps purchased item stacks from /me into the profile grid', () => {
    const store = useInventoryStore();
    const entries: InventoryEntry[] = [
      {
        id: 9,
        quantity: 3,
        slot: null,
        isEquiped: false,
        item: {
          id: 2,
          name: 'Iron Shield',
          description: 'Heavy shield',
          price: 50,
          icon: '',
          rarity: 'COMMON',
          equipmentType: ['SHIELD'],
          attributes: [],
          properties: [{ name: 'DEFENSE', description: null, value: 1 }],
        },
      },
    ];

    store.hydrateInventory(entries);

    expect(store.inventory).toEqual([
      {
        inventoryItemId: 9,
        id: 2,
        nameKey: 'Iron Shield',
        name: 'Iron Shield',
        icon: '',
        description: 'Heavy shield',
        price: 50,
        rarity: 'COMMON',
        rarityKey: 'COMMON',
        equipmentType: ['SHIELD'],
        attributes: [],
        properties: [{ name: 'DEFENSE', description: null, value: 1 }],
        quantity: 3,
        slot: null,
      },
    ]);
  });

  it('does not put equipped items into the backpack grid', () => {
    const store = useInventoryStore();
    const equipped = {
      id: 10,
      quantity: 1,
      slot: 'left-hand' as const,
      isEquiped: true,
      item: {
        id: 1,
        name: 'Sword',
        description: '',
        price: 10,
        icon: '',
        rarity: 'COMMON' as const,
        equipmentType: ['WEAPON' as const],
        attributes: [],
        properties: [],
      },
    };

    store.hydrateInventory([], [equipped]);

    expect(store.inventory).toEqual([]);
    expect(store.equipmentSlots.find((slot) => slot.id === 'left-hand')?.item?.name).toBe('Sword');
  });
});
