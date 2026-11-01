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
