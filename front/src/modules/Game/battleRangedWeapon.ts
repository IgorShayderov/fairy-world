import * as T from 'three';

import { createCrossbow } from './battleCrossbowModel';
import { closeGrip, gripRotation, palmGrip, placeArm } from './battleHeavyWeapon';

export const CROSSBOW_RIGHT_GRIP = new T.Vector3(0, -0.14, -0.18);
export const CROSSBOW_LEFT_GRIP = new T.Vector3(0, -0.025, 0.05);
const crossbowRightRotation = gripRotation(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), 'R');
const crossbowLeftRotation = gripRotation(new T.Vector3(0, 0, 1), new T.Vector3(0, 1, 0), 'L');
const carryFrames = new WeakMap<T.Object3D, { chest: T.Object3D; offset: T.Matrix4 }>();

/** Calibrate in the ready pose, then inherit the animated torso's bob, twist and recoil. */
function rangedCarryFrame(root: T.Object3D) {
  let frame = carryFrames.get(root);
  if (!frame) {
    const chest = root.getObjectByName('Rig_Chest');
    if (!chest) return root.matrixWorld.clone();
    frame = { chest, offset: chest.matrixWorld.clone().invert().multiply(root.matrixWorld) };
    carryFrames.set(root, frame);
  }
  return frame.chest.matrixWorld.clone().multiply(frame.offset);
}

/** The dominant palm owns the weapon; the support palm follows its fore-end socket. */
export function updateCrossbowGrip(root: T.Object3D, weapon: T.Object3D, bash = 0, falling = false) {
  const right = root.getObjectByName('Rig_hand_R');
  const left = root.getObjectByName('Rig_hand_L');
  if (!right || !left) return;
  root.updateMatrixWorld(true);
  const carryFrame = rangedCarryFrame(root);
  const solveHand = (side: 'R' | 'L', hand: T.Object3D, target: T.Vector3, rotation: T.Quaternion) => {
    const upper = root.getObjectByName(`Rig_Upper_Arm_${side}`);
    const lower = root.getObjectByName(`Rig_Lower_Arm_${side}`);
    if (!upper || !lower) return;
    const palmOffset = palmGrip.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(rotation);
    placeArm(
      upper,
      lower,
      hand,
      target.clone().sub(palmOffset),
      new T.Vector3(side === 'R' ? -0.7 : 0.7, 1.5, 0.4).applyMatrix4(carryFrame)
    );
    hand.quaternion.copy(hand.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
    hand.updateMatrixWorld(true);
    closeGrip(root, side);
  };
  if (!falling) {
    const orientation = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(carryFrame));
    // The torso already supplies the attack lean; extra reach must keep the support hand on the stock.
    const origin = new T.Vector3(0, 1.72, 0.32 + Math.min(bash, 0.04)).applyMatrix4(carryFrame);
    solveHand(
      'R',
      right,
      origin.add(CROSSBOW_RIGHT_GRIP.clone().applyQuaternion(orientation)),
      orientation.multiply(crossbowRightRotation)
    );
  }
  // Use the solved palm, not the requested IK target (which can be out of reach).
  weapon.quaternion.copy(right.getWorldQuaternion(new T.Quaternion())).multiply(crossbowRightRotation.clone().invert());
  weapon.position
    .copy(right.localToWorld(palmGrip.clone()))
    .sub(CROSSBOW_RIGHT_GRIP.clone().applyQuaternion(weapon.quaternion));
  weapon.updateMatrixWorld(true);
  if (!falling) {
    solveHand(
      'L',
      left,
      weapon.localToWorld(CROSSBOW_LEFT_GRIP.clone()),
      weapon.quaternion.clone().multiply(crossbowLeftRotation)
    );
  }
}

const bowLeftRotation = gripRotation(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), 'L');
const bowRightRotation = gripRotation(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, -1), 'R');

/** The left palm owns the bow; the drawing hand and string share the same socket.
 * Targets follow the animated chest, rather than freezing both arms in actor space.
 */
export function updateBowGrip(root: T.Object3D, weapon: T.Object3D, shotProgress?: number, bash = 0, falling = false) {
  const left = root.getObjectByName('Rig_hand_L');
  const right = root.getObjectByName('Rig_hand_R');
  if (!left || !right) return;
  root.updateMatrixWorld(true);
  const frame = rangedCarryFrame(root);
  const orientation = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(frame));
  const solve = (side: 'L' | 'R', hand: T.Object3D, target: T.Vector3, rotation: T.Quaternion) => {
    const upper = root.getObjectByName(`Rig_Upper_Arm_${side}`);
    const lower = root.getObjectByName(`Rig_Lower_Arm_${side}`);
    if (!upper || !lower) return;
    const offset = palmGrip.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(rotation);
    placeArm(
      upper,
      lower,
      hand,
      target.clone().sub(offset),
      new T.Vector3(side === 'L' ? 0.5 : -0.65, 1.76, side === 'L' ? 0.35 : -0.25).applyMatrix4(frame)
    );
    hand.quaternion.copy(hand.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
    hand.updateMatrixWorld(true);
    if (side === 'L') closeGrip(root, side);
    else {
      // Three fingers hook the string; the drawing hand is not a sword fist.
      for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
        for (const [suffix, curl] of [['', -0.25], ['_1', -1.1], ['_2', -0.8]] as const) {
          const bone = root.getObjectByName(`Rig_${finger}${suffix}_R`);
          if (bone) bone.rotation.set(finger === 'Pinky' ? -0.2 : curl, 0, 0);
        }
      }
    }
  };
  if (!falling) {
    solve(
      'L',
      left,
      new T.Vector3(0.12, 1.78, 0.7 + Math.min(bash, 0.04)).applyMatrix4(frame),
      orientation.clone().multiply(bowLeftRotation)
    );
  }
  weapon.position.copy(left.localToWorld(palmGrip.clone()));
  weapon.quaternion.copy(left.getWorldQuaternion(new T.Quaternion())).multiply(bowLeftRotation.clone().invert());
  weapon.updateMatrixWorld(true);
  const draw =
    shotProgress === undefined
      ? 0
      : shotProgress <= 0.3
        ? Math.sin(((Math.max(0, shotProgress) / 0.3) * Math.PI) / 2)
        : Math.max(0, 1 - (shotProgress - 0.3) / 0.12);
  const stringSocket = new T.Vector3(0, 0, -0.18 - draw * 0.42);
  if (!falling) {
    solve('R', right, weapon.localToWorld(stringSocket.clone()), weapon.quaternion.clone().multiply(bowRightRotation));
    // Use the solved hand so the string cannot float away if an authored pose limits reach.
    stringSocket.copy(weapon.worldToLocal(right.localToWorld(palmGrip.clone())));
  }
  const string = weapon.getObjectByName('Bowstring') as T.Line | undefined;
  if (string) {
    const positions = string.geometry.getAttribute('position') as T.BufferAttribute;
    positions.setXYZ(1, stringSocket.x, stringSocket.y, stringSocket.z);
    positions.needsUpdate = true;
    string.geometry.computeBoundingSphere();
  }
}

/** World units per second: close targets must not get a slowed-down projectile. */
export function projectileFlightSeconds(distance: number, bolt: boolean): number {
  return Math.max(0, distance) / (bolt ? 32 : 24);
}

export function createRangedWeapon(crossbow: boolean) {
  if (crossbow) return createCrossbow();
  const group = new T.Group();
  const wood = new T.MeshStandardMaterial({ color: '#785032', roughness: 0.7 });
  // +Z aims at the enemy. The grip is forward of the limb tips, and
  // the string sits behind it, toward the archer (-Z).
  const points = [new T.Vector3(0, -0.68, -0.18), new T.Vector3(0, 0, 0), new T.Vector3(0, 0.68, -0.18)];
  const limbs = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, 0.032, 8, false), wood);
  limbs.name = 'BowLimbs';
  group.add(limbs);
  const string = new T.Line(
    new T.BufferGeometry().setFromPoints([points[0]!, new T.Vector3(0, 0, -0.18), points[2]!]),
    new T.LineBasicMaterial({ color: '#dbd5bc' })
  );
  string.name = 'Bowstring';
  group.add(string);
  group.add(new T.Mesh(new T.CylinderGeometry(0.043, 0.043, 0.2, 10), wood));
  group.traverse((object) => {
    if (object instanceof T.Mesh) object.castShadow = true;
  });
  return group;
}

/** Model points down +Z, the same axis used to aim the shot. */
export function createProjectile(bolt: boolean) {
  const arrow = new T.Group();
  const length = bolt ? 0.38 : 0.65;
  const shaft = new T.Mesh(
    new T.CylinderGeometry(0.012, 0.012, length, 6),
    new T.MeshStandardMaterial({ color: '#bca77a' })
  );
  shaft.rotation.x = Math.PI / 2;
  arrow.add(shaft);
  const tip = new T.Mesh(
    new T.ConeGeometry(0.035, 0.1, 4),
    new T.MeshStandardMaterial({ color: '#cad9df', metalness: 0.8, roughness: 0.3 })
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = length / 2;
  arrow.add(tip);
  const feather = new T.Mesh(new T.BoxGeometry(0.08, 0.008, 0.12), new T.MeshStandardMaterial({ color: '#d2d4c9' }));
  feather.position.z = -length / 2;
  arrow.add(feather);
  return arrow;
}
