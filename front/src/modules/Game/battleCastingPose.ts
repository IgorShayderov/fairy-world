import { Vector3 } from 'three';

import type { Object3D } from 'three';

import { gripRotation, palmGrip, placeArm } from './battleHeavyWeapon';

/** Raise the focus, drive it toward the target, then return to guard. Never leave either hand behind. */
export function castingWeaponPose(progress: number) {
  const keys = [
    { t: 0, grip: [0, 1.6, 0.52], direction: [0, 1, 0] },
    { t: 0.28, grip: [0.18, 1.95, 0.48], direction: [0.1, 1, -0.1] },
    { t: 0.4, grip: [0, 1.7, 0.72], direction: [0, 0.35, 1] },
    { t: 0.65, grip: [0, 1.7, 0.72], direction: [0, 0.35, 1] },
    { t: 1, grip: [0, 1.6, 0.52], direction: [0, 1, 0] },
  ];
  const t = Math.max(0, Math.min(1, progress));
  const index = Math.max(
    1,
    keys.findIndex((key) => key.t >= t)
  );
  const a = keys[index - 1]!,
    b = keys[index]!;
  const f = (t - a.t) / (b.t - a.t);
  const ease = f * f * (3 - 2 * f);
  return {
    grip: new Vector3().fromArray(a.grip).lerp(new Vector3().fromArray(b.grip), ease),
    direction: new Vector3().fromArray(a.direction).lerp(new Vector3().fromArray(b.direction), ease).normalize(),
  };
}

/** Empty/offhand casting uses an open palm, with the elbow kept outside the torso. */
export function applyCastingGesture(root: Object3D, progress: number) {
  const upper = root.getObjectByName('Rig_Upper_Arm_L');
  const lower = root.getObjectByName('Rig_Lower_Arm_L');
  const hand = root.getObjectByName('Rig_hand_L');
  if (!upper || !lower || !hand) return;
  const power = Math.sin(Math.PI * Math.min(1, progress / 0.9));
  root.updateMatrixWorld(true);
  const original = hand.localToWorld(palmGrip.clone());
  const target = root.localToWorld(new Vector3(0.3, 1.85, 0.82));
  target.lerpVectors(original, target, Math.min(1, power * 1.7));
  const forward = new Vector3(0, 0, 1).transformDirection(root.matrixWorld);
  const rotation = gripRotation(new Vector3(0, 1, 0), forward, 'L');
  const offset = palmGrip.clone().multiply(hand.getWorldScale(new Vector3())).applyQuaternion(rotation);
  placeArm(upper, lower, hand, target.sub(offset), root.localToWorld(new Vector3(0.85, 1.55, 0.45)));
  hand.quaternion.copy(hand.parent!.getWorldQuaternion(rotation.clone()).invert().multiply(rotation));
  hand.updateMatrixWorld(true);
}
