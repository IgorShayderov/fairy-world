import { describe, expect, it } from 'vitest';
import { battleMovementPath } from '../src/modules/Game/battleMovementPath';

describe('3D hex movement', () => {
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
