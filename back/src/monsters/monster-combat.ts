import type { SkillEffect } from '../skills/skills.catalog';
import type { CombatStatuses } from '../skills/combat-status';

export type MonsterShot = {
  id: string;
  name: string;
  effect: SkillEffect;
  multiplier: number;
  action: 'ATTACK' | 'SKILL';
};
type EnemyState = { rangedSkillCooldown?: number; buffCooldown?: number; statuses?: CombatStatuses };
const ARCANE_FOCUS: MonsterShot = {
  id: 'arcane-focus',
  name: 'Arcane Focus',
  effect: 'empower',
  multiplier: 0,
  action: 'SKILL',
};

/** Buff charges are consumed by actual spells, not movement or a blocked line of sight. */
export function monsterSpellDamage(state: EnemyState, damage: number): number {
  const buff = state.statuses?.empower;
  if (!buff) return damage;
  const boosted = damage * (1 + buff.percent / 100);
  if (--buff.hits <= 0) delete state.statuses!.empower;
  return boosted;
}

export function monsterBuffEvent(shot: MonsterShot) {
  return {
    actor: 'MONSTER' as const,
    action: 'SKILL' as const,
    skillId: shot.id,
    skillName: shot.name,
    effect: shot.effect,
    damage: 0,
    critical: false,
    dodged: false,
    statusText: 'Spell damage +35% for the next 2 attacks',
  };
}
const shot = (id: string, name: string, effect: SkillEffect, boss = false): MonsterShot => ({
  id,
  name,
  effect,
  multiplier: boss ? 1.2 : 1,
  action: boss ? 'SKILL' : 'ATTACK',
});
export const RANGED_MONSTERS: Readonly<Record<string, MonsterShot>> = {
  'Goblin Hexer': shot('hex-bolt', 'Hex Bolt', 'arcane'),
  'Ash Invoker': shot('ember-bolt', 'Ember Bolt', 'fire'),
  'Frost Revenant': shot('frost-bolt', 'Frost Bolt', 'ice'),
  'Ember Wraith': shot('ember-bolt', 'Ember Bolt', 'fire'),
  'Veilbound Hexer': shot('hex-bolt', 'Hex Bolt', 'arcane'),
  'Frost Wraith': shot('frost-bolt', 'Frost Bolt', 'ice'),
  'Plague Seer': shot('plague-bolt', 'Plague Bolt', 'arcane'),
};
export const BOSS_RANGED_SKILLS: Readonly<Record<string, MonsterShot>> = {
  'Warden of the First Flame': shot('boss-flame', 'Infernal Orb', 'fire', true),
  'The Hollow King': shot('boss-hollow', 'Soul Spear', 'arcane', true),
  'Icebound Sovereign': shot('boss-ice', 'Glacial Shard', 'ice', true),
  'The Raven Lich': shot('boss-raven', 'Grave Bolt', 'arcane', true),
};

/** One decision per enemy turn, never on the player's movement-only action.
 * Bosses first approach, then may cast when kited. Two non-casting turns separate casts.
 * Cooldown is stored on the monster so reloads and party turns cannot reset it.
 */
export function chooseMonsterShot(
  type: string,
  state: EnemyState,
  adjacent: boolean,
  clearShot: boolean,
): MonsterShot | undefined {
  if (RANGED_MONSTERS[type]) {
    const cooldown = state.buffCooldown ?? 1;
    state.buffCooldown = Math.max(0, cooldown - 1);
    if (cooldown <= 0 && !state.statuses?.empower) {
      (state.statuses ??= {}).empower = { hits: 2, percent: 35 };
      state.buffCooldown = 4;
      return ARCANE_FOCUS;
    }
    return clearShot ? RANGED_MONSTERS[type] : undefined;
  }
  const skill = BOSS_RANGED_SKILLS[type];
  if (!skill) return undefined;
  const cooldown = state.rangedSkillCooldown ?? 1;
  if (cooldown <= 0 && !adjacent && clearShot) {
    state.rangedSkillCooldown = 2;
    return skill;
  }
  state.rangedSkillCooldown = Math.max(0, cooldown - 1);
  return undefined;
}
export function monsterCombatView(type: string, state: EnemyState) {
  const skill = BOSS_RANGED_SKILLS[type];
  return {
    attackStyle: RANGED_MONSTERS[type] ? ('RANGED' as const) : ('MELEE' as const),
    ...(skill ? { rangedSkill: { name: skill.name, cooldown: state.rangedSkillCooldown ?? 1 } } : {}),
  };
}
