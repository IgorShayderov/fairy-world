import {
  BOSS_RANGED_SKILLS,
  chooseMonsterShot,
  monsterCombatView,
  monsterSupportAction,
  RANGED_MONSTERS,
  slowBossDebuff,
} from './monster-combat';
import type { CombatStatuses } from '../skills/combat-status';

describe('monster ranged decisions', () => {
  it('slows the player for two turns without consuming the slow boss attack, with a persisted cooldown', () => {
    const boss = { debuffCooldown: 0, rangedSkillCooldown: 0 };
    const player: { health: number; statuses?: CombatStatuses } = { health: 100 };
    expect(slowBossDebuff('Icebound Sovereign', boss, player, false)?.skillName).toBe('Glacial Chains');
    expect(player.statuses?.slow).toEqual({ turns: 2, reduction: 2 });
    expect(chooseMonsterShot('Icebound Sovereign', boss, false, true)?.name).toBe('Glacial Shard');
    const restored = { ...boss };
    delete player.statuses;
    for (let i = 0; i < 5; i++) expect(slowBossDebuff('Icebound Sovereign', restored, player, false)).toBeUndefined();
    expect(slowBossDebuff('Icebound Sovereign', restored, player, false)).toBeDefined();
  });
  it('does not slow from fast bosses, minions, melee adjacency or petrified bosses', () => {
    const player = { health: 100 };
    expect(slowBossDebuff('The Raven Lich', { debuffCooldown: 0 }, player, false)).toBeUndefined();
    expect(slowBossDebuff('Cinder Stone Brute', { debuffCooldown: 0 }, player, false)).toBeUndefined();
    expect(slowBossDebuff('Icebound Sovereign', { debuffCooldown: 0 }, player, true)).toBeUndefined();
    expect(
      slowBossDebuff('Icebound Sovereign', { statuses: { petrify: { turns: 1 } } }, player, false),
    ).toBeUndefined();
  });
  it.each(Object.keys(RANGED_MONSTERS))(
    '%s heals at low HP without replacing its attack and persists cooldown',
    (name) => {
      let state: { health: number; maxHealth: number; buffCooldown?: number; statuses?: CombatStatuses } = {
        health: 50,
        maxHealth: 100,
      };
      expect(monsterSupportAction(name, state)).toMatchObject({
        effect: 'heal',
        healing: 25,
        damage: 0,
        action: 'SKILL',
      });
      expect(state.health).toBe(75);
      expect(chooseMonsterShot(name, state, false, true)?.action).toBe('ATTACK');
      expect(state.buffCooldown).toBe(4);
      state = JSON.parse(JSON.stringify(state)) as typeof state;
      state.health = 20;
      for (let i = 0; i < 4; i++) {
        expect(monsterSupportAction(name, state)).toBeUndefined();
        expect(chooseMonsterShot(name, state, false, true)?.action).toBe('ATTACK');
      }
      expect(monsterSupportAction(name, state)?.healing).toBe(25);
      expect(state.health).toBe(45);
    },
  );
  it('does not heal healthy, dead, petrified, or non-mage enemies', () => {
    for (const health of [100, 51, 0]) {
      const state = { health, maxHealth: 100 };
      expect(monsterSupportAction('Frost Wraith', state)).toBeUndefined();
      expect(state.health).toBe(health);
    }
    const frozen = { health: 20, maxHealth: 100, buffCooldown: 3, statuses: { petrify: { turns: 1 } } };
    expect(monsterSupportAction('Frost Wraith', frozen)).toBeUndefined();
    expect(frozen.buffCooldown).toBe(3);
    expect(monsterSupportAction('Stone Golem', { health: 20, maxHealth: 100 })).toBeUndefined();
    expect(monsterSupportAction('Icebound Sovereign', { health: 20, maxHealth: 100 })).toBeUndefined();
  });
  it('replaces old persisted empowerment and can heal without a clear shot', () => {
    const state = { health: 10, maxHealth: 100, statuses: { empower: { hits: 2, percent: 35 } } };
    expect(monsterSupportAction('Frost Wraith', state)?.healing).toBe(25);
    expect(state.statuses.empower).toBeUndefined();
    expect(chooseMonsterShot('Frost Wraith', state, false, false)).toBeUndefined();
    expect(state.health).toBe(35);
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
