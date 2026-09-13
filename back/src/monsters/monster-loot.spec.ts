import { ItemRarity } from '../../generated/client';
import { rollMonsterLootRarity } from './monster-loot';

describe('monster loot rarity', () => {
  it.each([
    [0.1, null],
    [0.6, ItemRarity.COMMON],
    [0.87, ItemRarity.MAGIC],
    [0.96, ItemRarity.RARE],
    [0.995, ItemRarity.UNIQUE],
  ])('maps roll %s to %s', (roll, expected) => {
    expect(rollMonsterLootRarity(() => roll)).toBe(expected);
  });
});
