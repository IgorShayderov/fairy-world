import { PLAYER_CLASSES, SKILLS, skillPoints, skillRanks, upgradeError } from './skills.catalog';

describe('skill tree progression', () => {
  it.each([1, 20, 100])('grants level %i existing players their full allowance without a backfill', (level) => {
    expect(skillPoints(level, skillRanks(null, null))).toEqual({ total: level, spent: 0, available: level });
  });

  it('adds exactly one unspent point after a level up', () => {
    const ranks = { 'warrior-might': 3, 'warrior-cleave': 2 };
    expect(skillPoints(5, ranks).available).toBe(0);
    expect(skillPoints(6, ranks).available).toBe(1);
  });

  it('provides two complete three-tier branches for each class', () => {
    for (const playerClass of PLAYER_CLASSES) {
      const skills = SKILLS.filter((skill) => skill.class === playerClass);
      expect(skills).toHaveLength(6);
      expect(skills.filter((skill) => skill.effect)).toHaveLength(3);
      for (const skill of skills) {
        if (skill.prerequisite)
          expect(skills.some((parent) => parent.id === skill.prerequisite && parent.tier < skill.tier)).toBe(true);
      }
    }
    expect(new Set(SKILLS.map((skill) => skill.id)).size).toBe(SKILLS.length);
  });

  it('rejects wrong-class skills, missing prerequisites, overspending and maximum ranks', () => {
    const might = SKILLS.find((skill) => skill.id === 'warrior-might')!;
    const armor = SKILLS.find((skill) => skill.id === 'warrior-armor')!;
    expect(upgradeError(might, 'MAGE', 20, {})).toMatch(/your class/);
    expect(upgradeError(armor, 'WARRIOR', 4, {})).toMatch(/level 5/);
    expect(upgradeError(armor, 'WARRIOR', 5, {})).toMatch(/prerequisite/);
    expect(upgradeError(might, 'WARRIOR', 1, { 'warrior-might': 1 })).toMatch(/No skill points/);
    expect(upgradeError(might, 'WARRIOR', 30, { 'warrior-might': 20 })).toMatch(/maximum/);
    expect(upgradeError(armor, 'WARRIOR', 5, { 'warrior-might': 3 })).toBeNull();
  });

  it('never activates foreign, fractional or corrupt saved ranks', () => {
    expect(
      skillRanks('WARRIOR', { 'mage-fireball': 1, 'warrior-might': 1.5, 'warrior-cleave': 21, 'warrior-armor': 3 }),
    ).toEqual({ 'warrior-armor': 3 });
  });
});
