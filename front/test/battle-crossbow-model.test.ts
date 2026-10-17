import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCrossbow, updateCrossbowMechanism } from '../src/modules/Game/battleCrossbowModel';
import { castingWeaponPose } from '../src/modules/Game/battleCastingPose';

describe('crossbow model and cast poses', () => {
  it('has a wide steel prod, trigger, rail and visible loaded ammunition', () => {
    const model = createCrossbow();
    for (const name of ['Carved walnut stock', 'Recurved steel limb', 'Steel bolt rail', 'Trigger guard', 'Foot stirrup', 'Loaded bolt']) {
      expect(model.getObjectByName(name), name).toBeDefined();
    }
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    expect(size.x).toBeGreaterThan(1);
    expect(size.z).toBeGreaterThan(1);
    expect(size.y).toBeLessThan(0.5);
  });
  it('releases the string and bolt, then reloads without changing the grip transform', () => {
    const model = createCrossbow();
    const string = model.getObjectByName('String 1')!;
    const start = string.position.clone();
    updateCrossbowMechanism(model, 0.5);
    expect(model.getObjectByName('Loaded bolt')!.visible).toBe(false);
    expect(string.position.distanceTo(start)).toBeGreaterThan(0.1);
    updateCrossbowMechanism(model, 1);
    expect(model.getObjectByName('Loaded bolt')!.visible).toBe(true);
    expect(string.position.distanceTo(start)).toBeLessThan(0.001);
    updateCrossbowMechanism(model, undefined, false);
    expect(model.getObjectByName('Loaded bolt')!.visible).toBe(false);
    expect(model.position.length()).toBe(0);
  });
  it('casts with a distinct raised-focus and forward-release pose, then returns to guard', () => {
    expect(castingWeaponPose(0.28).grip.y).toBeGreaterThan(castingWeaponPose(0).grip.y);
    expect(castingWeaponPose(0.4).direction.z).toBeGreaterThan(0.8);
    expect(castingWeaponPose(1).grip.distanceTo(castingWeaponPose(0).grip)).toBeLessThan(0.001);
  });
});
