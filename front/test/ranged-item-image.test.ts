import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { rangedItemImage } from '../src/modules/Inventory/utils/rangedItemImage';

describe('ranged item images shared by shop, inventory and comparisons', () => {
  it.each(['bow', 'crossbow', 'arrows', 'bolts', 'staff', 'robe'])('resolves the real %s asset even with a translated name', (kind) => {
    const icon = `icon_${kind}.svg`;
    const path = `/icons/items/${icon}`;
    expect(rangedItemImage({ nameKey: 'Предмет', icon })).toBe(path);
    expect(rangedItemImage({ nameKey: 'Предмет', icon: path })).toBe(path);
    expect(existsSync(new URL(`../public${path}`, import.meta.url))).toBe(true);
  });

  it.each(['bow', 'crossbow', 'arrows', 'bolts', 'staff', 'robe'])(
    'repairs legacy %s image fallbacks using the raw item name',
    (kind) => {
      expect(rangedItemImage({ nameKey: `Sharp ${kind} of Strength`, name: 'Предмет', icon: 'icon_sword.png' })).toBe(
        `/icons/items/icon_${kind}.svg`
      );
    }
  );

  it('leaves other equipment and empty slots unchanged', () => {
    expect(rangedItemImage({ nameKey: 'Sword', icon: 'icon_sword.png' })).toBeUndefined();
    expect(rangedItemImage(null)).toBeUndefined();
  });
});
