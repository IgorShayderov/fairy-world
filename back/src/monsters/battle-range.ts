type Cube = { x: number; y: number; z: number };
// Finite JSON-safe value: loaded bows/crossbows can cover any battlefield.
export const UNLIMITED_WEAPON_RANGE = Number.MAX_SAFE_INTEGER;
export function weaponAttackRange(range = 1): number {
  return range > 1 ? UNLIMITED_WEAPON_RANGE : 1;
}
const cube = (cell: number, columns: number): Cube => {
  const z = Math.floor(cell / columns);
  const x = (cell % columns) - (z - (z & 1)) / 2;
  return { x, y: -x - z, z };
};
export function canShoot(from: number, to: number, columns: number, range: number, blocked: number[]) {
  const a = cube(from, columns),
    b = cube(to, columns);
  const distance = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
  if (distance === 0 || distance > range) return false;
  for (let step = 1; step < distance; step++) {
    const t = step / distance;
    const x = a.x + (b.x - a.x) * t + 0.000001;
    const y = a.y + (b.y - a.y) * t + 0.000001;
    const z = a.z + (b.z - a.z) * t - 0.000002;
    let rx = Math.round(x),
      ry = Math.round(y),
      rz = Math.round(z);
    const dx = Math.abs(rx - x),
      dy = Math.abs(ry - y),
      dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    if (blocked.includes(rz * columns + rx + (rz - (rz & 1)) / 2)) return false;
  }
  return true;
}
