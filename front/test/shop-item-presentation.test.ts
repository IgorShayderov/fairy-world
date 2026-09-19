import { describe, expect, it } from 'vitest';

import enProfile from '@/locales/en/modules/profile';
import ruProfile from '@/locales/ru/modules/profile';
import { removeRarityPrefix } from '@/modules/Inventory/utils/rarity';
import { getItemTypeLocaleKey } from '@/modules/Shop/utils/itemPresentation';

describe('shop item presentation', () => {
  it('maps generated equipment types to short localized item names', () => {
    expect(getItemTypeLocaleKey(['WEAPON'])).toBe('profile.items.sword');
    expect(getItemTypeLocaleKey(['WEAPON'], 'Deadly Axe of Wisdom')).toBe('profile.items.axe');
    expect(getItemTypeLocaleKey(['WEAPON'], 'Iron Dagger')).toBe('profile.items.dagger');
    expect(getItemTypeLocaleKey(['WEAPON'], 'Deadly Two-handed Sword')).toBe('profile.items.twoHandedSword');
    expect(getItemTypeLocaleKey(['WEAPON'], 'Iron Sword')).toBe('profile.items.sword');
    expect(getItemTypeLocaleKey(['RING'])).toBe('profile.items.ring');
    expect(getItemTypeLocaleKey(['AMULET'])).toBe('profile.items.amulet');
    expect(getItemTypeLocaleKey([])).toBe('profile.items.unknown');
  });

  it('contains translations for every generated rarity in both locales', () => {
    const rarities = ['quest', 'common', 'magic', 'rare', 'unique'] as const;

    for (const rarity of rarities) {
      expect(enProfile.rarity[rarity]).toBeTruthy();
      expect(ruProfile.profile.rarity[rarity]).toBeTruthy();
    }
  });

  it('separates the rarity from generated descriptions so it can be highlighted', () => {
    expect(removeRarityPrefix('MAGIC level 98 sword.', 'MAGIC')).toBe('level 98 sword.');
    expect(removeRarityPrefix('A reliable iron shield.', 'COMMON')).toBe('A reliable iron shield.');
  });
});
