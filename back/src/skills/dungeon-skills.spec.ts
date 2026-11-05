import { castDungeonSkill, dungeonSkillView, type DungeonSkillState } from './dungeon-skills';
import { SKILLS, skillBaseManaCost, skillDamageMultiplier } from './skills.catalog';
import { applyRangerStatus, finishStatusTurn } from './combat-status';

describe('dungeon ability balance', () => {
  it.each(SKILLS.filter((skill) => skill.effect))('$name improves and costs more at every rank', (skill) => {
    let previousCost = 0;
    let previousPower = 0;
    for (let rank = 1; rank <= skill.maxRank; rank++) {
      const state: DungeonSkillState = {
        class: skill.class,
        ranks: { [skill.id]: rank },
        mana: 1000,
        maxMana: 1000,
        spellPower: 100,
        loadedRangedWeapon: true,
        turn: 1,
        readyOnTurn: {},
        manaCostReduction: 40,
      };
      const fighter = { health: 1, maxHealth: 1000, damage: 100, defense: 0 };
      const target = { ...fighter };
      const events = [{ actor: 'PLAYER' as const, damage: 10, critical: false, dodged: false, healing: 0 }];
      const strike = jest.fn<void, [typeof fighter, typeof fighter, boolean]>();
      const cost = dungeonSkillView(state, fighter)!.abilities[0].manaCost;
      expect(cost).toBeGreaterThan(previousCost);
      castDungeonSkill(state, skill.id, fighter, target, events, strike, 'Hero');
      expect(state.mana).toBe(1000 - cost);
      const power = skill.effect === 'heal' ? events.at(-1)!.healing : strike.mock.calls[0][0].damage;
      expect(power).toBeGreaterThan(previousPower);
      if (skill.effect !== 'heal') expect(power).toBeCloseTo(100 * skillDamageMultiplier(skill, rank));
      expect(skillBaseManaCost(skill, rank)).toBe(skill.manaCost! + (rank - 1) * 2);
      previousCost = cost;
      previousPower = power;
    }
  });
  it('leaves a gap between Frost Arrow slows', () => {
    const skill = SKILLS.find((entry) => entry.id === 'scout-aim')!;
    const target = { defense: 0, movement: 5, statuses: {} };
    applyRangerStatus(target, skill.id, 20, { damage: 10, dodged: false });
    for (let turn = 0; turn < 3; turn++) finishStatusTurn(target);
    expect(target.statuses).not.toHaveProperty('slow');
    expect(skill.cooldown).toBe(5);
  });
  it.each(SKILLS.filter((skill) => skill.effect && skill.effect !== 'heal'))(
    '$name uses the new cost and correct critical policy',
    (skill) => {
      const state: DungeonSkillState = {
        class: skill.class,
        ranks: { [skill.id]: 1 },
        mana: 200,
        maxMana: 200,
        spellPower: 50,
        loadedRangedWeapon: true,
        turn: 1,
        readyOnTurn: {},
        manaCostReduction: 20,
      };
      const fighter = { health: 1000, maxHealth: 1000, damage: 50, defense: 0, criticalChance: 100 };
      const cost = dungeonSkillView(state, fighter)!.abilities[0].manaCost;
      const strike = jest.fn();
      const events = [{ actor: 'PLAYER' as const, damage: 10, critical: false, dodged: false }];
      castDungeonSkill(state, skill.id, fighter, { ...fighter }, events, strike, 'Mage');
      expect(state.mana).toBe(200 - cost);
      expect(strike).toHaveBeenCalledWith(
        expect.objectContaining({ criticalChance: skill.canCrit ? 100 : 0 }),
        expect.any(Object),
        skill.class === 'MAGE',
      );
      expect(fighter.criticalChance).toBe(100);
    },
  );
  it('raises all active ability costs by fifty percent', () => {
    expect(SKILLS.filter((skill) => skill.effect).map((skill) => skill.manaCost)).toEqual([
      24, 48, 72, 24, 48, 78, 30, 54, 90,
    ]);
  });
});
