import { castDungeonSkill, dungeonSkillView, type DungeonSkillState } from './dungeon-skills';
import { SKILLS } from './skills.catalog';

describe('dungeon ability balance', () => {
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
      );
      expect(fighter.criticalChance).toBe(100);
    },
  );
  it('doubles base costs for all active abilities', () => {
    expect(SKILLS.filter((skill) => skill.effect).map((skill) => skill.manaCost)).toEqual([
      16, 32, 48, 16, 32, 52, 20, 36, 60,
    ]);
  });
});
