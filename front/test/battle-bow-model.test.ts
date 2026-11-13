import { Line, Mesh, TubeGeometry } from 'three';
import { expect, it } from 'vitest';
import { createRangedWeapon } from '../src/modules/Game/battleRangedWeapon';

it('curves the bow tips toward the archer with the resting string behind the grip', () => {
  const bow = createRangedWeapon(false);
  const limbs = bow.getObjectByName('BowLimbs') as Mesh<TubeGeometry>;
  const curve = limbs.geometry.parameters.path;
  const string = (bow.getObjectByName('Bowstring') as Line).geometry.getAttribute('position');
  expect(curve.getPoint(0.5).z).toBeCloseTo(0);
  for (const [index, progress] of [[0, 0], [2, 1]] as const) {
    const tip = curve.getPoint(progress);
    expect(tip.z).toBeLessThan(0);
    expect(string.getZ(index)).toBeCloseTo(tip.z);
    expect(string.getY(index)).toBeCloseTo(tip.y);
  }
  expect(string.getZ(1)).toBeCloseTo(string.getZ(0));
});
