import type { SkillEffect } from '../skills/skills.catalog';
import type { CombatStatuses } from '../skills/combat-status';
import { monsterMovement } from './battle-movement';

export type MonsterShot = {
  id: string;
  name: string;
  effect: SkillEffect;
  multiplier: number;
  action: 'ATTACK' | 'SKILL';
};
type EnemyState = {
  rangedSkillCooldown?: number;
  buffCooldown?: number;
  debuffCooldown?: number;
  statuses?: CombatStatuses;
};
export const MONSTER_RENEWAL = { threshold: 0.5, restore: 0.25, cooldown: 4 } as const;

/** Once per actual enemy turn, before its normal movement/attack. Never consumes the attack.
 * Keep the persisted buffCooldown field so reconnecting cannot reset a support skill's cooldown.
 */
export function monsterSupportAction(type: string, state: EnemyState & { health: number; maxHealth: number }) {
  if (!RANGED_MONSTERS[type] || state.health <= 0 || state.statuses?.petrify?.turns) return;
  // Saved encounters may still contain the superseded Arcane Focus buff.
  if (state.statuses) delete state.statuses.empower;
  const cooldown = state.buffCooldown ?? 0;
  state.buffCooldown = Math.max(0, cooldown - 1);
  if (cooldown > 0 || state.health > state.maxHealth * MONSTER_RENEWAL.threshold) return;
  const healing = Math.min(
    state.maxHealth - state.health,
    Math.max(1, Math.round(state.maxHealth * MONSTER_RENEWAL.restore)),
  );
  state.health += healing;
  state.buffCooldown = MONSTER_RENEWAL.cooldown;
  return {
    actor: 'MONSTER' as const,
    action: 'SKILL' as const,
    skillId: 'soul-renewal',
    skillName: 'Soul Renewal',
    effect: 'heal' as const,
    healing,
    damage: 0,
    critical: false,
    dodged: false,
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

export function slowBossDebuff(
  type: string,
  state: EnemyState,
  target: { health: number; statuses?: CombatStatuses },
  adjacent: boolean,
) {
  if (!BOSS_RANGED_SKILLS[type] || monsterMovement(type) > 2 || state.statuses?.petrify?.turns || target.health <= 0)
    return;
  const cooldown = state.debuffCooldown ?? 1;
  state.debuffCooldown = Math.max(0, cooldown - 1);
  if (cooldown > 0 || adjacent || target.statuses?.slow?.turns) return;
  target.statuses ??= {};
  target.statuses.slow = { turns: 2, reduction: 2 };
  state.debuffCooldown = 5;
  return {
    actor: 'MONSTER' as const,
    action: 'SKILL' as const,
    skillId: 'boss-glacial-chains',
    skillName: 'Glacial Chains',
    effect: 'ice' as const,
    statusText: 'Slowed: -2 movement for 2 turns',
    damage: 0,
    critical: false,
    dodged: false,
  };
}

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
    ...(skill && monsterMovement(type) <= 2
      ? { debuffSkill: { name: 'Glacial Chains', cooldown: state.debuffCooldown ?? 1 } }
      : {}),
  };
}
