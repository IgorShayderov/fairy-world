import { ItemRarity } from '../../generated/client';
import { rollMonsterLootRarity, rollDungeonLootRarity, rollQuestLootRarity } from './monster-loot';

describe('monster loot rarity', () => {
  it.each([
    [0, ItemRarity.RARE],
    [0.6999, ItemRarity.RARE],
    [0.7, ItemRarity.UNIQUE],
    [0.999, ItemRarity.UNIQUE],
  ])('guarantees a 70/30 Rare-or-Unique dungeon drop at %s', (roll, expected) => {
    expect(rollDungeonLootRarity(() => roll)).toBe(expected);
  });
  it.each([
    [0.1, null],
    [0.899, null],
    [0.9, ItemRarity.COMMON],
    [0.9675, ItemRarity.MAGIC],
    [0.99, ItemRarity.RARE],
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
