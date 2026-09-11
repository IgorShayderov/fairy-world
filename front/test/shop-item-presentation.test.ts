import { describe, expect, it } from 'vitest';

import enProfile from '@/locales/en/modules/profile';
import ruProfile from '@/locales/ru/modules/profile';
import { getItemTypeLocaleKey } from '@/modules/Shop/utils/itemPresentation';

describe('shop item presentation', () => {
  it('maps generated equipment types to short localized item names', () => {
    expect(getItemTypeLocaleKey(['WEAPON'])).toBe('profile.items.sword');
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
});
