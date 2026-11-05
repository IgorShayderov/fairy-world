import { describe, expect, it } from 'vitest';
import { battleEventMovementPath, battleMovementPath } from '../src/modules/Game/battleMovementPath';

describe('3D hex movement', () => {
  it('routes around the enemy before its later move, not its final position', () => {
    const battle = {
      arena: { columns: 9, rows: 5, blockedCells: [], playerPosition: 13, monsterPosition: 21 },
      events: [
        { actor: 'PLAYER', action: 'MOVE', fromCell: 10, toCell: 13 },
        { actor: 'MONSTER', action: 'MOVE', fromCell: 11, toCell: 21 },
      ],
    } satisfies Parameters<typeof battleEventMovementPath>[0];
    const path = battleEventMovementPath(battle, 0);
    expect(path.at(-1)).toBe(13);
    expect(path).not.toContain(11);
    expect(battleEventMovementPath(battle, 1)).not.toContain(13);
  });
  it('never crosses an occupied destination or invents a straight-line path', () => {
    const battle = {
      arena: { columns: 9, rows: 5, blockedCells: [], playerPosition: 13, monsterPosition: 13 },
      events: [{ actor: 'PLAYER', action: 'MOVE', fromCell: 10, toCell: 13 }],
    } satisfies Parameters<typeof battleEventMovementPath>[0];
    expect(battleEventMovementPath(battle, 0)).toEqual([]);
  });
  it('walks around blocked cells', () => {
    const path = battleMovementPath(10, 13, 9, 5, [11, 12]);
    expect(path.at(-1)).toBe(13);
    expect(path).not.toContain(11);
    expect(path).not.toContain(12);
  });
  it('does not replay a move at its destination', () => {
    expect(battleMovementPath(5, 5, 9, 5, [])).toEqual([]);
  });
  it('does not wrap across board edges', () => {
    expect(battleMovementPath(8, 9, 9, 5, []).length).toBeGreaterThan(1);
  });
});
