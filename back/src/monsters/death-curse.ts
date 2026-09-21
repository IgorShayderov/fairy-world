import { PlayerBuffType } from '../../generated/client';

export const DEATH_CURSES: Array<{ type: PlayerBuffType; value: number }> = [
  { type: PlayerBuffType.DEFENSE, value: -4 },
  { type: PlayerBuffType.DAMAGE, value: -2 },
  { type: PlayerBuffType.EXPERIENCE, value: -8 },
];

export const rollDeathCurse = (
  level: number,
  random: () => number = Math.random,
): { type: PlayerBuffType; value: number } | null => {
  if (level <= 10 || random() >= 0.2) return null;
  return DEATH_CURSES[Math.floor(random() * DEATH_CURSES.length)];
};
