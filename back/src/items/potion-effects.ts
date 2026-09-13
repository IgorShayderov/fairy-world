import { PlayerBuffType } from '../../generated/client';

export const POTION_BUFF_DURATION_MS = 4 * 60 * 60 * 1_000;

export type PotionEffect =
  | { kind: 'HEALTH'; restore: number }
  | { kind: 'BUFF'; type: PlayerBuffType; value: number }
  | { kind: 'FREE_ATTRIBUTE'; value: number };

export const POTION_EFFECTS: Record<string, PotionEffect> = {
  'Lesser Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 10 },
  'Mild Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 25 },
  'Higher Experience Potion': { kind: 'BUFF', type: PlayerBuffType.EXPERIENCE, value: 50 },
  'Lesser Health Potion': { kind: 'HEALTH', restore: 50 },
  'Mild Health Potion': { kind: 'HEALTH', restore: 150 },
  'Higher Health Potion': { kind: 'HEALTH', restore: 500 },
  'Lesser Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 5 },
  'Mild Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 15 },
  'Higher Attack Potion': { kind: 'BUFF', type: PlayerBuffType.DAMAGE, value: 50 },
  'Lesser Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 5 },
  'Mild Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 15 },
  'Higher Defense Potion': { kind: 'BUFF', type: PlayerBuffType.DEFENSE, value: 50 },
  'Free Attribute Potion': { kind: 'FREE_ATTRIBUTE', value: 1 },
};

export const getPotionEffect = (name: string): PotionEffect | undefined => POTION_EFFECTS[name];
export const isHealthPotion = (name: string): boolean => getPotionEffect(name)?.kind === 'HEALTH';
