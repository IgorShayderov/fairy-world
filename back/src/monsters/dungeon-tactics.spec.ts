import {
  dungeonArena,
  dungeonNeighbors,
  dungeonPaths,
  initialDungeonTactics,
  moveDungeonEnemy,
  moveDungeonPlayer,
} from './dungeon-tactics';

describe('dungeon hex movement', () => {
  it('allows exactly one move followed by an action and rejects invalid destinations', () => {
    const state = initialDungeonTactics('guardian');
    expect(dungeonArena(state, 3).reachableCells).not.toContain(42);
    expect(() => moveDungeonPlayer(state, 42, 3)).toThrow();
    expect(() => moveDungeonPlayer(state, NaN, 3)).toThrow();
    expect(() => moveDungeonPlayer(state, 38, 3)).toThrow();
    const move = moveDungeonPlayer(state, 37, 3);
    expect(move).toMatchObject({ fromCell: 34, toCell: 37 });
    expect(dungeonArena(state).reachableCells).toEqual([]);
    expect(() => moveDungeonPlayer(state, 38, 3)).toThrow();
  });
  it('monster movement is counted in hexes and stops beside the player', () => {
    const state = initialDungeonTactics('guardian');
    const first = moveDungeonEnemy(state, 3);
    expect(dungeonPaths(first.fromCell, state.playerPosition).get(first.toCell)).toHaveLength(4);
    expect(dungeonNeighbors(state.monsterPosition)).not.toContain(state.playerPosition);
    moveDungeonEnemy(state, 3);
    moveDungeonEnemy(state, 3);
    expect(dungeonNeighbors(state.monsterPosition)).toContain(state.playerPosition);
    expect(state.monsterPosition).not.toBe(state.playerPosition);
  });
  it('validates ranged attacks separately from melee', () => {
    const state = initialDungeonTactics('guardian');
    expect(dungeonArena(state, 3, 2, 7).canAttack).toBe(true);
    state.playerPosition = 37;
    expect(dungeonArena(state, 3, 2, 7).canAttack).toBe(true);
    expect(dungeonArena(state, 3, 2, 1).canAttack).toBe(false);
  });
});
