import { HEAVY_MONSTERS, monsterMovement } from './battle-movement';
import { RANGED_MONSTERS } from './monster-combat';

export const DUNGEON_BALANCE_VERSION = 6;

export function reduceMageMinionDodge(enemy: { dodge: number }, type: string, boss: boolean): void {
  if (!boss && RANGED_MONSTERS[type]) enemy.dodge = Math.max(0, enemy.dodge * 0.5);
}

type DungeonEnemyStats = {
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
};

/** Applied once at creation or when migrating a pre-v5 saved dungeon. */
export function rebalanceIceboundDamage(enemy: DungeonEnemyStats, type: string): void {
  if (type === 'Icebound Sovereign') enemy.damage = Math.max(1, Math.floor(enemy.damage * 0.7));
}

/** Shared by new enemies and saved runs. Never revive a defeated opponent. */
export function strengthenDungeonEnemy(enemy: DungeonEnemyStats, boss: boolean): void {
  const remaining = Math.max(0, Math.min(1, enemy.health / Math.max(1, enemy.maxHealth)));
  enemy.maxHealth = Math.max(1, Math.round(enemy.maxHealth * (boss ? 1.75 : 1.5)));
  enemy.health = remaining > 0 ? Math.max(1, Math.round(enemy.maxHealth * remaining)) : 0;
  enemy.damage = Math.ceil(enemy.damage * (boss ? 1.4 : 1.3));
  enemy.defense = Math.min(60, enemy.defense + (boss ? 8 : 5));
}

/** Slow minions need a tank budget too; use base movement, never a temporary slow. */
export function fortifySlowDungeonMinion(enemy: DungeonEnemyStats, type: string, boss: boolean): void {
  const movement = monsterMovement(type);
  if (boss || movement > 2) return;
  const remaining = Math.max(0, Math.min(1, enemy.health / Math.max(1, enemy.maxHealth)));
  enemy.maxHealth = Math.max(1, Math.round(enemy.maxHealth * (HEAVY_MONSTERS.has(type) ? 2.5 : 1.6)));
  enemy.health = remaining > 0 ? Math.max(1, Math.round(enemy.maxHealth * remaining)) : 0;
  enemy.defense = 60;
}
