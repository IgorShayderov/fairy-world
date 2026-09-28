import { describe, expect, it } from 'vitest';

import { getBattleMonsterVisual } from '@/modules/Game/monsterVisual';

describe('tactical monster visuals', () => {
  it.each([
    ['Dire Wolf', '/images/battle/enemy-dire-wolf.png'],
    ['Bone Knight', '/images/battle/enemy-bone-knight.png'],
    ['Stone Golem', '/images/battle/enemy-stone-golem.png'],
    ['Storm Harpy', '/images/battle/enemy-storm-harpy.png'],
    ['Dragon', '/images/battle/enemy-dragon.png'],
    ['Infernal Minotaur', '/images/battle/enemy-brute.png'],
  ])('uses the correct cutout for %s', (monsterType, expected) => {
    expect(getBattleMonsterVisual(monsterType, `Cursed ${monsterType}`)).toBe(expected);
  });

  it('uses monster type rather than a misleading generated display name', () => {
    expect(getBattleMonsterVisual('Dire Wolf', 'Mythic Infernal Minotaur')).toBe(
      '/images/battle/enemy-dire-wolf.png',
    );
  });

  it('gives unknown monsters a stable non-empty fallback', () => {
    const first = getBattleMonsterVisual('Unknown Beast', 'Ashfang');
    expect(first).toBe(getBattleMonsterVisual('Unknown Beast', 'Ashfang'));
    expect(first).toMatch(/^\/images\/battle\/enemy-/);
  });
});
