import { Matrix4, Quaternion, Vector3 } from 'three';

import type { Object3D } from 'three';

/** Reactions were authored for separate weapons/shields, not a shared handle. */
export function needsTwoHandedGrip(animationName: string, swinging: boolean): boolean {
  return swinging || animationName === 'knight_idle_heavy_weapon' || /hurt|block|dodge/i.test(animationName);
}

/** Local coordinates: +Z faces the opponent. The hands share one rigid grip. */
export function heavyWeaponPose(progress: number | undefined, diagonal = false) {
  const poses = [
    { t: 0, grip: [0, 1.6, 0.38], direction: [0, 1, 0] },
    { t: 0.32, grip: [diagonal ? 0.35 : 0, 2.12, 0.12], direction: [diagonal ? 1 : 0, 1, -0.35] },
    { t: 0.43, grip: [diagonal ? 0.35 : 0, 2.12, 0.12], direction: [diagonal ? 1 : 0, 1, -0.35] },
    { t: 0.57, grip: [0, 1.65, 0.42], direction: [diagonal ? -0.5 : 0, -0.3, 1] },
    { t: 0.68, grip: [diagonal ? -0.25 : 0, 1.45, 0.3], direction: [diagonal ? -0.8 : 0, -1, 0.6] },
    { t: 1, grip: [0, 1.6, 0.38], direction: [0, 1, 0] },
  ];
  const t = Math.max(0, Math.min(1, progress ?? 0));
  const index = Math.max(
    1,
    poses.findIndex((pose) => pose.t >= t)
  );
  const a = poses[index - 1]!;
  const b = poses[index]!;
  const fraction = (t - a.t) / (b.t - a.t);
  const eased = fraction * fraction * (3 - 2 * fraction);
  return {
    grip: new Vector3().fromArray(a.grip).lerp(new Vector3().fromArray(b.grip), eased),
    direction: new Vector3().fromArray(a.direction).lerp(new Vector3().fromArray(b.direction), eased).normalize(),
  };
}

// The wrist is not the grip socket. The handle crosses the curled palm along X.
export const palmGrip = new Vector3(0, 0.11, -0.035);

export function gripRotation(direction: Vector3, forward: Vector3, side: 'L' | 'R') {
  const x = direction
    .clone()
    .normalize()
    .multiplyScalar(side === 'L' ? 1 : -1);
  const y = forward.clone().addScaledVector(x, -forward.dot(x));
  if (y.lengthSq() < 0.001) {
    y.set(0, 1, 0).addScaledVector(x, -x.y);
  }
  y.normalize();
  const z = new Vector3().crossVectors(x, y).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

export function closeGrip(root: Object3D, side: 'L' | 'R') {
  for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
    for (const [suffix, curl] of [
      ['', -1.05],
      ['_1', -1.25],
      ['_2', -0.85],
    ] as const) {
      const bone = root.getObjectByName(`Rig_${finger}${suffix}_${side}`);
      if (bone) bone.rotation.set(curl, 0, 0);
    }
  }
}

function aimBone(bone: Object3D, child: Object3D, destination: Vector3) {
  const origin = bone.getWorldPosition(new Vector3());
  const from = child.getWorldPosition(new Vector3()).sub(origin).normalize();
  const to = destination.clone().sub(origin).normalize();
  const world = new Quaternion().setFromUnitVectors(from, to).multiply(bone.getWorldQuaternion(new Quaternion()));
  const parent = bone.parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion();
  bone.quaternion.copy(parent.invert().multiply(world));
  bone.updateMatrixWorld(true);
}

/** Analytic two-bone IK keeps both hands on the handle throughout the swing. */
export function placeArm(upper: Object3D, lower: Object3D, hand: Object3D, target: Vector3, elbowHint: Vector3) {
  const shoulder = upper.getWorldPosition(new Vector3());
  const elbow = lower.getWorldPosition(new Vector3());
  const wrist = hand.getWorldPosition(new Vector3());
  const a = shoulder.distanceTo(elbow);
  const b = elbow.distanceTo(wrist);
  if (a < 0.0001 || b < 0.0001) return;
  const axis = target.clone().sub(shoulder);
  const distance = Math.max(Math.abs(a - b) + 0.0001, Math.min(axis.length(), a + b - 0.0001));
  axis.normalize();
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const bend = elbowHint.clone().sub(shoulder);
  bend.addScaledVector(axis, -bend.dot(axis));
  if (bend.lengthSq() < 0.0001) bend.crossVectors(axis, new Vector3(0, 1, 0));
  bend.normalize();
  const desiredElbow = shoulder
    .clone()
    .addScaledVector(axis, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
  aimBone(upper, lower, desiredElbow);
  aimBone(lower, hand, shoulder.clone().addScaledVector(axis, distance));
}
