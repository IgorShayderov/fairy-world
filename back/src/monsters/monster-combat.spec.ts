import {
  BOSS_RANGED_SKILLS,
  chooseMonsterShot,
  monsterCombatView,
  monsterSpellDamage,
  RANGED_MONSTERS,
} from './monster-combat';
import type { CombatStatuses } from '../skills/combat-status';

describe('monster ranged decisions', () => {
  it.each(Object.keys(RANGED_MONSTERS))('%s buffs two spells without permanently increasing base damage', (name) => {
    let state: { buffCooldown?: number; statuses?: CombatStatuses } = {};
    expect(chooseMonsterShot(name, state, false, true)?.action).toBe('ATTACK');
    expect(chooseMonsterShot(name, state, false, true)?.effect).toBe('empower');
    expect(state.statuses?.empower).toEqual({ hits: 2, percent: 35 });
    state = JSON.parse(JSON.stringify(state)) as typeof state;
    // No target: no charge is spent, and refreshing cannot recast/stack the buff.
    expect(chooseMonsterShot(name, state, false, false)).toBeUndefined();
    expect(state.statuses?.empower?.hits).toBe(2);
    for (let i = 0; i < 2; i++) {
      expect(chooseMonsterShot(name, state, false, true)?.action).toBe('ATTACK');
      expect(monsterSpellDamage(state, 100)).toBe(135);
    }
    expect(state.statuses?.empower).toBeUndefined();
    expect(chooseMonsterShot(name, state, false, true)?.action).toBe('ATTACK');
    expect(monsterSpellDamage(state, 100)).toBe(100);
    expect(chooseMonsterShot(name, state, false, true)?.effect).toBe('empower');
  });
  it.each(Object.keys(BOSS_RANGED_SKILLS))('%s approaches first, then casts with two turns between spells', (name) => {
    const state = {};
    expect(chooseMonsterShot(name, state, false, true)).toBeUndefined();
    expect(chooseMonsterShot(name, state, false, true)?.action).toBe('SKILL');
    // Round-trip persisted state, as when reloading a saved battle.
    const restored: { rangedSkillCooldown?: number } = { ...state };
    expect(monsterCombatView(name, restored).rangedSkill?.cooldown).toBe(2);
    expect(chooseMonsterShot(name, restored, false, true)).toBeUndefined();
    expect(chooseMonsterShot(name, restored, false, true)).toBeUndefined();
    expect(chooseMonsterShot(name, restored, false, true)?.action).toBe('SKILL');
  });

  it('keeps bosses melee at close range and does not cast through obstacles', () => {
    const state = { rangedSkillCooldown: 0 };
    expect(chooseMonsterShot('Icebound Sovereign', state, true, true)).toBeUndefined();
    expect(chooseMonsterShot('Icebound Sovereign', state, false, false)).toBeUndefined();
    expect(state.rangedSkillCooldown).toBe(0);
    expect(chooseMonsterShot('Icebound Sovereign', state, false, true)?.effect).toBe('ice');
  });

  it.each(Object.keys(RANGED_MONSTERS))('%s shoots when it has a clear target', (name) => {
    expect(chooseMonsterShot(name, {}, false, true)?.action).toBe('ATTACK');
    expect(chooseMonsterShot(name, {}, true, true)?.action).toBe('ATTACK');
    expect(chooseMonsterShot(name, {}, false, false)).toBeUndefined();
    expect(monsterCombatView(name, {}).attackStyle).toBe('RANGED');
  });

  it('leaves ordinary melee creatures unchanged', () => {
    expect(chooseMonsterShot('Stone Golem', {}, false, true)).toBeUndefined();
    expect(monsterCombatView('Stone Golem', {})).toEqual({ attackStyle: 'MELEE' });
  });
});
