import { ItemRarity } from '../../generated/client';
import { rollMonsterLootRarity, rollDungeonLootRarity, rollQuestLootRarity } from './monster-loot';

describe('monster loot rarity', () => {
  it.each([
    [0.19, null],
    [0.2, ItemRarity.COMMON],
    [0.6, ItemRarity.MAGIC],
    [0.85, ItemRarity.RARE],
    [0.97, ItemRarity.UNIQUE],
  ])('uses improved dungeon loot odds at %s', (roll, expected) => {
    expect(rollDungeonLootRarity(() => roll)).toBe(expected);
  });
  it.each([
    [0.1, null],
    [0.8, ItemRarity.COMMON],
    [0.935, ItemRarity.MAGIC],
    [0.98, ItemRarity.RARE],
    [0.999, ItemRarity.UNIQUE],
  ])('maps roll %s to %s', (roll, expected) => {
    expect(rollMonsterLootRarity(() => roll)).toBe(expected);
  });
});

describe('quest loot', () => {
  it.each([
    [0, null],
    [0.8999, null],
    [0.9, ItemRarity.MAGIC],
    [0.97, ItemRarity.RARE],
    [0.999, ItemRarity.UNIQUE],
  ])('roll %s gives %s', (roll, rarity) => {
    expect(rollQuestLootRarity(() => roll)).toBe(rarity);
  });
});
