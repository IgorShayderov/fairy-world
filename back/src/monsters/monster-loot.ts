import { ItemRarity } from '../../generated/client';

export const MONSTER_LOOT_TABLE: Array<{ rarity: ItemRarity | null; chance: number }> = [
  { rarity: null, chance: 60 },
  { rarity: ItemRarity.COMMON, chance: 27 },
  { rarity: ItemRarity.MAGIC, chance: 9 },
  { rarity: ItemRarity.RARE, chance: 3 },
  { rarity: ItemRarity.UNIQUE, chance: 1 },
];

export const rollMonsterLootRarity = (random: () => number = Math.random): ItemRarity | null => {
  let roll = random() * 100;
  for (const entry of MONSTER_LOOT_TABLE) {
    roll -= entry.chance;
    if (roll < 0) return entry.rarity;
  }
  return null;
};
