import { Bone, Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { palmGrip } from '../src/modules/Game/battleHeavyWeapon';
import { CROSSBOW_LEFT_GRIP, CROSSBOW_RIGHT_GRIP, updateCrossbowGrip } from '../src/modules/Game/battleRangedWeapon';

function rig() {
  const root = new Group();
  for (const side of ['L', 'R']) {
    const upper = new Bone(),
      lower = new Bone(),
      hand = new Bone();
    upper.name = `Rig_Upper_Arm_${side}`;
    lower.name = `Rig_Lower_Arm_${side}`;
    hand.name = `Rig_hand_${side}`;
    upper.position.set(side === 'R' ? -0.3 : 0.3, 2, 0);
    lower.position.y = -0.48;
    hand.position.y = -0.48;
    root.add(upper);
    upper.add(lower);
    lower.add(hand);
  }
  return root;
}

describe('rigid crossbow grip', () => {
  it('inherits torso movement instead of pinning the hands to the actor root', () => {
    const root = rig();
    const chest = new Bone();
    chest.name = 'Rig_Chest';
    for (const arm of [...root.children]) chest.add(arm);
    root.add(chest);
    const weapon = new Group();
    updateCrossbowGrip(root, weapon);
    const initialPosition = weapon.position.clone();
    const initialRotation = weapon.quaternion.clone();
    chest.position.set(0.06, 0.08, -0.04);
    chest.rotation.set(0.1, 0.2, -0.06);
    updateCrossbowGrip(root, weapon);
    expect(weapon.position.distanceTo(initialPosition.clone().applyMatrix4(chest.matrixWorld))).toBeLessThan(0.0001);
    expect(weapon.quaternion.angleTo(chest.quaternion.clone().multiply(initialRotation))).toBeLessThan(0.0001);
    for (const [side, socket] of [
      ['R', CROSSBOW_RIGHT_GRIP],
      ['L', CROSSBOW_LEFT_GRIP],
    ] as const) {
      const palm = root.getObjectByName(`Rig_hand_${side}`)!.localToWorld(palmGrip.clone());
      expect(palm.distanceTo(weapon.localToWorld(socket.clone()))).toBeLessThan(0.0001);
    }
    const stablePosition = weapon.position.clone();
    updateCrossbowGrip(root, weapon);
    expect(weapon.position.distanceTo(stablePosition)).toBeLessThan(0.0001);
  });
  it.each([0, 0.7, -1.3])('keeps both palms on their sockets while turning by %s', (angle) => {
    const root = rig();
    const weapon = new Group();
    root.position.set(4, 0.12, -2);
    root.rotation.y = angle;
    for (const bash of [0, -0.036, 0.3, 0]) {
      root.getObjectByName('Rig_Upper_Arm_R')!.rotation.z = 0.5;
      root.getObjectByName('Rig_Upper_Arm_L')!.rotation.x = -0.4;
      updateCrossbowGrip(root, weapon, bash);
      for (const [side, socket] of [
        ['R', CROSSBOW_RIGHT_GRIP],
        ['L', CROSSBOW_LEFT_GRIP],
      ] as const) {
        const palm = root.getObjectByName(`Rig_hand_${side}`)!.localToWorld(palmGrip.clone());
        expect(palm.distanceTo(weapon.localToWorld(socket.clone())), `${side} hand, bash ${bash}`).toBeLessThan(0.0001);
      }
    }
  });

  it('follows the right hand during a fall without overriding its animation', () => {
    const root = rig();
    const weapon = new Group();
    const hand = root.getObjectByName('Rig_hand_R')!;
    hand.rotation.set(0.4, 0.8, -0.5);
    const rotation = hand.quaternion.clone();
    updateCrossbowGrip(root, weapon, 0, true);
    expect(hand.quaternion.equals(rotation)).toBe(true);
    expect(
      hand.localToWorld(palmGrip.clone()).distanceTo(weapon.localToWorld(CROSSBOW_RIGHT_GRIP.clone()))
    ).toBeLessThan(0.0001);
    expect(weapon.position.distanceTo(new Vector3())).toBeGreaterThan(0);
  });
});
