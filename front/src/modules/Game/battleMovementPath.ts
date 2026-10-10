/** Presentation-only path. Move legality remains server-authoritative. */
export function battleMovementPath(from: number, to: number, columns: number, rows: number, blocked: number[]) {
  const parents = new Map<number, number | null>([[from, null]]);
  const obstacles = new Set(blocked);
  const queue = [from];
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index]!;
    if (cell === to) {
      const path: number[] = [];
      let cursor: number | null = to;
      while (cursor !== null && cursor !== from) {
        path.unshift(cursor);
        cursor = parents.get(cursor) ?? null;
      }
      return path;
    }
    const row = Math.floor(cell / columns);
    const column = cell % columns;
    const side = row % 2 === 0 ? -1 : 1;
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [side, -1],
      [0, 1],
      [side, 1],
    ]) {
      const x = column + dx!;
      const y = row + dy!;
      const next = y * columns + x;
      if (x < 0 || x >= columns || y < 0 || y >= rows || obstacles.has(next) || parents.has(next)) continue;
      parents.set(next, cell);
      queue.push(next);
    }
  }
  return [];
}
