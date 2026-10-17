import { ItemRarity } from '../../generated/client';

export const isMageEquipment = (name: string) => /\b(staff|robe)\b/i.test(name);

/** Robes trade armor for spell efficiency. This is percentage reduction, not a combat rating. */
export function robeManaReduction(item: { name: string; rarity: ItemRarity }): number {
  if (!/\brobe\b/i.test(item.name)) return 0;
  return { COMMON: 5, MAGIC: 10, RARE: 15, UNIQUE: 20, QUEST: 20 }[item.rarity];
}

export function magicSkillManaCost(baseCost: number, playerClass: string, reduction: number): number {
  if (!baseCost) return 0;
  return playerClass === 'MAGE'
    ? Math.max(1, Math.ceil(baseCost * (1 - Math.min(40, Math.max(0, reduction)) / 100)))
    : baseCost;
}
