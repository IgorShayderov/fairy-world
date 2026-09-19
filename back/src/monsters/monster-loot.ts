import { ItemRarity } from '../../generated/client';

export const MONSTER_LOOT_TABLE: Array<{ rarity: ItemRarity | null; chance: number }> = [
  { rarity: null, chance: 90 },
  { rarity: ItemRarity.COMMON, chance: 6.75 },
  { rarity: ItemRarity.MAGIC, chance: 2.25 },
  { rarity: ItemRarity.RARE, chance: 0.75 },
  { rarity: ItemRarity.UNIQUE, chance: 0.25 },
];

export const rollMonsterLootRarity = (random: () => number = Math.random): ItemRarity | null => {
  let roll = random() * 100;
  for (const entry of MONSTER_LOOT_TABLE) {
    roll -= entry.chance;
    if (roll < 0) return entry.rarity;
  }
  return null;
};

export const rollDungeonLootRarity = (random: () => number = Math.random): ItemRarity | null => {
  const roll = random() * 100;
  if (roll < 20) return null;
  if (roll < 65) return ItemRarity.MAGIC;
  if (roll < 97) return ItemRarity.RARE;
  return ItemRarity.UNIQUE;
};

export const rollQuestLootRarity = (random: () => number = Math.random): ItemRarity | null => {
  const roll = random();
  if (roll < 0.9) return null;
  if (roll < 0.97) return ItemRarity.MAGIC;
  if (roll < 0.995) return ItemRarity.RARE;
  return ItemRarity.UNIQUE;
};
