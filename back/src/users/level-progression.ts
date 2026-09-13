export const MAX_PLAYER_LEVEL = 100;
export const FREE_ATTRIBUTES_PER_LEVEL = 5;
// XP required within each level (not cumulative). Level 100 is the cap.
export const EXPERIENCE_MAP: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(
    Array.from({ length: MAX_PLAYER_LEVEL - 1 }, (_, index) => {
      const level = index + 1;
      return [level, 100 * level * level];
    }),
  ),
);

export function experienceToNextLevel(level: number): number | null {
  return EXPERIENCE_MAP[level] ?? null;
}

export function progressionAfterExperience(level: number, experience: number) {
  if (level >= MAX_PLAYER_LEVEL) return { level: MAX_PLAYER_LEVEL, experience: 0, freeAttributes: 0 };
  if (experience >= EXPERIENCE_MAP[level]) {
    // Overflow is intentionally discarded: a level-up resets XP to zero.
    return { level: level + 1, experience: 0, freeAttributes: FREE_ATTRIBUTES_PER_LEVEL };
  }
  return { level, experience, freeAttributes: 0 };
}

export function requiredPlayerLevel(itemLevel: number) {
  return Math.max(1, Math.ceil(itemLevel - 3 * 1.1));
}
