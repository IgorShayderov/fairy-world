import { PlayerBuffType } from '../../generated/client';

export const POTION_BUFF_DURATION_MS = 4 * 60 * 60 * 1_000;

export type PotionEffect =
  | { kind: 'HEALTH'; restore: number }
  | { kind: 'BUFF'; type: PlayerBuffType; value: number }
  | { kind: 'FREE_ATTRIBUTE'; value: number };

export const POTION_EFFECTS: Record<string, PotionEffect> = {
  // 10+ Level Potions
  'Lesser Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 10 },
  'Lesser Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 5 },
  'Lesser Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 5 },

  // 20+ Level Potions
  'Medium Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 20 },
  'Medium Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 10 },
  'Medium Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 10 },
  'Moderate Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 20 },
  'Moderate Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 10 },
  'Moderate Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 10 },

  // 30+ Level Potions
  'Mild Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 30 },
  'Mild Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 20 },
  'Mild Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 20 },
  'Free Attribute Potion': { kind: 'FREE_ATTRIBUTE', value: 1 },

  // 40+ Level Potions
  'Greater Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 40 },
  'Greater Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 30 },
  'Greater Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 30 },

  // 50+ Level Potions
  'Higher Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 50 },
  'Higher Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 50 },
  'Higher Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 50 },

  // Internal / health test compatibility
  'Lesser Health Potion': { kind: 'HEALTH', restore: 50 },
  'Mild Health Potion': { kind: 'HEALTH', restore: 150 },
  'Higher Health Potion': { kind: 'HEALTH', restore: 500 },
};

export const POTION_LEVEL_REQUIREMENTS: Record<string, number> = {
  'Lesser Experience Potion': 10,
  'Lesser Attack Potion': 10,
  'Lesser Defense Potion': 10,

  'Medium Experience Potion': 20,
  'Medium Attack Potion': 20,
  'Medium Defense Potion': 20,
  'Moderate Experience Potion': 20,
  'Moderate Attack Potion': 20,
  'Moderate Defense Potion': 20,

  'Mild Experience Potion': 30,
  'Mild Attack Potion': 30,
  'Mild Defense Potion': 30,
  'Free Attribute Potion': 30,

  'Greater Experience Potion': 40,
  'Greater Attack Potion': 40,
  'Greater Defense Potion': 40,

  'Higher Experience Potion': 50,
  'Higher Attack Potion': 50,
  'Higher Defense Potion': 50,
};

export const getPotionEffect = (name: string): PotionEffect | undefined => POTION_EFFECTS[name];
export const isHealthPotion = (name: string): boolean => getPotionEffect(name)?.kind === 'HEALTH';
export const getPotionRequiredLevel = (name: string): number => POTION_LEVEL_REQUIREMENTS[name] ?? 1;
