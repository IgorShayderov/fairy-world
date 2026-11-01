import type { BattleState, DungeonRunState } from '@/modules/Monsters/api';

import { battleMovementPath } from './battleMovementPath';

export function dungeonAttackHint(battle: BattleState): string {
  const arena = battle.arena;
  const range = arena.playerAttackRange ?? 1;
  const distance = battleMovementPath(
    arena.playerPosition,
    arena.monsterPosition,
    arena.columns,
    arena.rows,
    arena.blockedCells
  ).length;
  const summary = `${range > 1 ? 'Range: unlimited' : 'Range: 1 hex'} · Target: ${distance} hexes`;
  if (arena.canAttack) return `${summary} — ready to attack`;
  if (distance > range) {
    const steps = distance - range;
    return `${summary} — move ${steps} ${steps === 1 ? 'hex' : 'hexes'} closer${arena.playerHasMoved ? ' next turn' : ''}`;
  }
  return summary;
}

/** Maps a persisted dungeon wave onto the shared battlefield; legality is checked by the server. */
export function dungeonBattle(run: DungeonRunState, userId: number | undefined, exchange = false): BattleState {
  const replay = exchange ? run.exchange : undefined;
  const opponent =
    run.opponents.find((o) => o.id === (replay?.opponentId ?? run.tactical?.opponentId)) ??
    run.opponents.find((o) => o.status === 'AVAILABLE') ??
    run.opponents[run.opponents.length - 1]!;
  const member = run.party?.members.find((m) =>
    replay?.actorProfileId ? m.profileId === replay.actorProfileId : m.userId === userId
  );
  const player = member
    ? {
        ...run.player,
        ...member,
        health: member.health ?? 0,
        maxHealth: member.maxHealth ?? 1,
        movement: member.movement ?? 3,
      }
    : { ...run.player, movement: run.player.movement ?? 3 };
  // Legacy encounters had no movement phase: both combatants were in melee.
  // Match the server's legacy restoration instead of inventing distant spawns.
  const playerPosition = replay?.playerPosition ?? run.tactical?.playerPosition ?? 40;
  const monsterPosition = replay?.monsterPosition ?? run.tactical?.monsterPosition ?? 41;
  // Old saved runs still contain the former 6/7-hex bow/crossbow range.
  const range = (player.attackRange ?? 1) > 1 ? Number.MAX_SAFE_INTEGER : 1;
  const enemyMovement = opponent.monster.statuses?.petrify?.turns
    ? 0
    : Math.max(1, (opponent.monster.movement ?? 2) - (opponent.monster.statuses?.slow?.reduction ?? 0));
  const path = battleMovementPath(playerPosition, monsterPosition, 11, 7, []);
  const active = run.status === 'ACTIVE' && !exchange && player.health > 0;
  return {
    id: run.id,
    monsterType: opponent.monsterType,
    turn: run.tactical?.turn ?? 1,
    status: player.health <= 0 ? 'DEFEAT' : opponent.monster.health <= 0 ? 'VICTORY' : run.status,
    player,
    monster: { ...opponent.monster, movement: enemyMovement, id: run.opponents.indexOf(opponent) + 1 },
    events: replay?.events ?? [],
    canRetreat: false,
    powerAttackCooldown: 0,
    ...(run.skills ? { skills: run.skills } : {}),
    arena: {
      columns: 11,
      rows: 7,
      playerPosition,
      monsterPosition,
      playerMovement: player.movement,
      monsterMovement: enemyMovement,
      blockedCells: [],
      playerHasMoved: run.tactical?.moved ?? false,
      playerAttackRange: range,
      canAttack: active && path.length > 0 && path.length <= range,
      reachableCells:
        !active || run.tactical?.moved
          ? []
          : Array.from({ length: 77 }, (_, cell) => cell).filter((cell) => {
              if (cell === playerPosition || cell === monsterPosition) return false;
              const route = battleMovementPath(playerPosition, cell, 11, 7, [monsterPosition]);
              return route.length > 0 && route.length <= player.movement;
            }),
    },
  };
}

/** Build one animation exchange, including responses from pre-tactical runs. */
export function dungeonReplay(
  next: DungeonRunState,
  previous: DungeonRunState,
  userId: number | undefined
): BattleState | undefined {
  if (next.tactical && next.tactical.revision !== (previous.tactical?.revision ?? 0)) {
    return dungeonBattle(next, userId, true);
  }
  if (next.tactical) return undefined;
  const before = previous.latestEvents.map((event) => JSON.stringify(event));
  const after = next.latestEvents.map((event) => JSON.stringify(event));
  let overlap = Math.min(before.length, after.length);
  while (overlap > 0 && !before.slice(-overlap).every((event, index) => event === after[index])) overlap--;
  const events = next.latestEvents.slice(overlap);
  if (!events.length) return undefined;
  const current = dungeonBattle(previous, userId);
  const opponent = previous.opponents.find((entry) => entry.status === 'AVAILABLE' && entry.monster.health > 0);
  if (!opponent) return undefined;
  return dungeonBattle(
    {
      ...next,
      exchange: {
        opponentId: opponent.id,
        events,
        playerPosition: current.arena.playerPosition,
        monsterPosition: current.arena.monsterPosition,
      },
    },
    userId,
    true
  );
}
