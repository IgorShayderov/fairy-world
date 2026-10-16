import { Bone, Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { gripRotation, heavyWeaponPose, needsTwoHandedGrip, placeArm } from '../src/modules/Game/battleHeavyWeapon';
import { monsterModels } from '../src/modules/Game/battleMonsterModels';

describe('two-handed weapon choreography', () => {
  it('keeps the shared grip during hits, defend, blocked hits and recovery', () => {
    for (const name of [
      'knight_hurt_left',
      'knight_shield_block',
      'knight_block_2_weapon',
      'knight_idle_heavy_weapon',
      'knight_walk_in_place',
    ]) {
      expect(needsTwoHandedGrip(name, false), name).toBe(true);
    }
    expect(needsTwoHandedGrip('knight_attack_2_heavy_weapon', true)).toBe(true);
    expect(needsTwoHandedGrip('knight_front_attacked_fall', false)).toBe(false);
  });
  it('keeps both grip targets in front of the chest throughout either strike', () => {
    for (const diagonal of [false, true]) {
      for (let step = 0; step <= 100; step++) {
        const { grip, direction } = heavyWeaponPose(step / 100, diagonal);
        expect(grip.z).toBeGreaterThanOrEqual(0.5);
        expect(grip.clone().addScaledVector(direction, 0.22).z).toBeGreaterThan(0.4);
      }
    }
  });
  it('holds a vertical sword and returns to the same guard after both swings', () => {
    const guard = heavyWeaponPose(undefined);
    expect(guard.direction.toArray()).toEqual([0, 1, 0]);
    for (const diagonal of [false, true]) {
      const end = heavyWeaponPose(1, diagonal);
      expect(end.grip.toArray()).toEqual(guard.grip.toArray());
      expect(end.direction.toArray()).toEqual(guard.direction.toArray());
    }
  });
  it('aligns the handle through each palm, toward the thumb, rather than along the fingers', () => {
    for (const side of ['L', 'R'] as const) {
      const direction = new Vector3(0, 1, 0);
      const rotation = gripRotation(direction, new Vector3(0, 0, 1), side);
      const thumbAxis = new Vector3(side === 'L' ? 1 : -1, 0, 0).applyQuaternion(rotation);
      expect(thumbAxis.distanceTo(direction)).toBeLessThan(0.00001);
    }
  });
  it('cuts downward past contact, rather than stopping after the wind-up', () => {
    const raised = heavyWeaponPose(0.32);
    const contact = heavyWeaponPose(0.57);
    const follow = heavyWeaponPose(0.68);
    expect(raised.direction.y).toBeGreaterThan(0.9);
    expect(contact.direction.y).toBeLessThan(0);
    expect(follow.direction.y).toBeLessThan(-0.8);
    expect(follow.grip.y).toBeLessThan(contact.grip.y);
    expect(heavyWeaponPose(0.32, true).direction.x).toBeGreaterThan(0.4);
    expect(heavyWeaponPose(0.68, true).direction.x).toBeLessThan(-0.4);
  });
  it('places a rotated arm on its grip target without stretching the bones', () => {
    const root = new Group();
    root.rotation.y = 1.1;
    const upper = new Bone(),
      lower = new Bone(),
      hand = new Bone();
    root.add(upper);
    upper.add(lower);
    lower.add(hand);
    lower.position.y = 0.4;
    hand.position.y = 0.4;
    root.updateMatrixWorld(true);
    const target = new Vector3(0.3, 0.3, 0.3);
    placeArm(upper, lower, hand, target, new Vector3(-1, 0, 0));
    expect(hand.getWorldPosition(new Vector3()).distanceTo(target)).toBeLessThan(0.00001);
    expect(lower.position.length()).toBeCloseTo(0.4);
    expect(hand.position.length()).toBeCloseTo(0.4);
  });
  it('keeps skeletons shorter than the 2.5-unit player', () => {
    expect(monsterModels['Bone Knight']!.height).toBeLessThan(2.5);
  });
});
