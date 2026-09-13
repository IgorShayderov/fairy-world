import {
  EXPERIENCE_MAP,
  experienceToNextLevel,
  progressionAfterExperience,
  requiredPlayerLevel,
} from './level-progression';

describe('level progression', () => {
  it('defines increasing requirements for every level below 100', () => {
    expect(Object.keys(EXPERIENCE_MAP)).toHaveLength(99);
    expect(EXPERIENCE_MAP[1]).toBe(100);
    for (let level = 2; level < 100; level++) expect(EXPERIENCE_MAP[level]).toBeGreaterThan(EXPERIENCE_MAP[level - 1]);
    expect(experienceToNextLevel(100)).toBeNull();
  });
  it('retains experience below the threshold', () => {
    expect(progressionAfterExperience(1, 99)).toEqual({ level: 1, experience: 99, freeAttributes: 0 });
  });
  it.each([100, 5000])('levels once and clears all XP at %s XP', (xp) => {
    expect(progressionAfterExperience(1, xp)).toEqual({ level: 2, experience: 0, freeAttributes: 5 });
  });
  it('awards the last level but never exceeds 100', () => {
    expect(progressionAfterExperience(99, EXPERIENCE_MAP[99])).toEqual({
      level: 100,
      experience: 0,
      freeAttributes: 5,
    });
    expect(progressionAfterExperience(100, 99999999)).toEqual({ level: 100, experience: 0, freeAttributes: 0 });
  });
  it('allows items three integer levels above the player, but not four', () => {
    expect(requiredPlayerLevel(4)).toBe(1);
    expect(requiredPlayerLevel(5)).toBe(2);
    expect(requiredPlayerLevel(103)).toBe(100);
    expect(requiredPlayerLevel(104)).toBe(101);
  });
});
