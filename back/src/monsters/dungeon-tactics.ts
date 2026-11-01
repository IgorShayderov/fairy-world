import { BadRequestException } from '@nestjs/common';
import { canShoot, weaponAttackRange } from './battle-range';

export type DungeonAction = { action?: 'ATTACK' | 'MOVE' | 'DEFEND' | 'SKILL'; targetCell?: number };
export type DungeonTactics = {
  turn: number;
  revision: number;
  opponentId: string;
  playerPosition: number;
  monsterPosition: number;
  moved: boolean;
  movingProfileId?: number;
};
export const DUNGEON_COLUMNS = 11;
export const DUNGEON_ROWS = 7;

export function dungeonNeighbors(cell: number): number[] {
  const row = Math.floor(cell / DUNGEON_COLUMNS),
    column = cell % DUNGEON_COLUMNS;
  const diagonal = row % 2 ? 1 : -1;
  return [
    [-1, 0],
    [1, 0],
    [0, -1],
    [diagonal, -1],
    [0, 1],
    [diagonal, 1],
  ]
    .map(([x, y]) => [column + x, row + y])
    .filter(([x, y]) => x >= 0 && x < DUNGEON_COLUMNS && y >= 0 && y < DUNGEON_ROWS)
    .map(([x, y]) => y * DUNGEON_COLUMNS + x);
}

export function dungeonPaths(start: number, occupied: number): Map<number, number[]> {
  const paths = new Map<number, number[]>([[start, [start]]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const cell of dungeonNeighbors(current)) {
      if (cell === occupied || paths.has(cell)) continue;
      paths.set(cell, [...paths.get(current)!, cell]);
      queue.push(cell);
    }
  }
  return paths;
}

export function dungeonArena(tactics: DungeonTactics, movement = 3, enemyMovement = 2, range = 1) {
  range = weaponAttackRange(range);
  return {
    columns: DUNGEON_COLUMNS,
    rows: DUNGEON_ROWS,
    playerPosition: tactics.playerPosition,
    monsterPosition: tactics.monsterPosition,
    playerMovement: movement,
    monsterMovement: enemyMovement,
    blockedCells: [] as number[],
    reachableCells: tactics.moved
      ? []
      : [...dungeonPaths(tactics.playerPosition, tactics.monsterPosition)]
          .filter(([, path]) => path.length > 1 && path.length <= movement + 1)
          .map(([cell]) => cell),
    canAttack: canShoot(tactics.playerPosition, tactics.monsterPosition, DUNGEON_COLUMNS, range, []),
    playerAttackRange: range,
    playerHasMoved: tactics.moved,
  };
}

export function moveDungeonPlayer(tactics: DungeonTactics, target: number | undefined, movement: number) {
  if (!Number.isInteger(target) || !dungeonArena(tactics, movement).reachableCells.includes(target!)) {
    throw new BadRequestException('Choose a highlighted hex within your remaining movement');
  }
  const fromCell = tactics.playerPosition;
  tactics.playerPosition = target!;
  tactics.moved = true;
  return {
    actor: 'PLAYER' as const,
    action: 'MOVE' as const,
    fromCell,
    toCell: target!,
    damage: 0,
    critical: false,
    dodged: false,
  };
}

export function moveDungeonEnemy(tactics: DungeonTactics, movement: number) {
  const paths = dungeonPaths(tactics.monsterPosition, tactics.playerPosition);
  const route = [...paths.values()]
    .filter((path) => dungeonNeighbors(path[path.length - 1]).includes(tactics.playerPosition))
    .sort((a, b) => a.length - b.length)[0];
  const fromCell = tactics.monsterPosition;
  if (route) tactics.monsterPosition = route[Math.min(movement, route.length - 1)];
  return {
    actor: 'MONSTER' as const,
    action: 'MOVE' as const,
    fromCell,
    toCell: tactics.monsterPosition,
    damage: 0,
    critical: false,
    dodged: false,
  };
}

export function initialDungeonTactics(opponentId: string): DungeonTactics {
  return { turn: 1, revision: 0, opponentId, playerPosition: 34, monsterPosition: 42, moved: false };
}
