import * as T from 'three';

import { createCrossbow } from './battleCrossbowModel';
import { closeGrip, gripRotation, palmGrip, placeArm } from './battleHeavyWeapon';

export const CROSSBOW_RIGHT_GRIP = new T.Vector3(0, -0.14, -0.18);
export const CROSSBOW_LEFT_GRIP = new T.Vector3(0, -0.025, 0.05);
const crossbowRightRotation = gripRotation(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), 'R');
const crossbowLeftRotation = gripRotation(new T.Vector3(0, 0, 1), new T.Vector3(0, 1, 0), 'L');
const carryFrames = new WeakMap<T.Object3D, { chest: T.Object3D; offset: T.Matrix4 }>();

/** Calibrate in the ready pose, then inherit the animated torso's bob, twist and recoil. */
function crossbowCarryFrame(root: T.Object3D) {
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
  const carryFrame = crossbowCarryFrame(root);
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

/** World units per second: close targets must not get a slowed-down projectile. */
export function projectileFlightSeconds(distance: number, bolt: boolean): number {
  return Math.max(0, distance) / (bolt ? 32 : 24);
}

export function createRangedWeapon(crossbow: boolean) {
  if (crossbow) return createCrossbow();
  const group = new T.Group();
  const wood = new T.MeshStandardMaterial({ color: '#785032', roughness: 0.7 });
  const points = [new T.Vector3(0, -0.68, 0.18), new T.Vector3(0, 0, 0), new T.Vector3(0, 0.68, 0.18)];
  group.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, 0.032, 8, false), wood));
  const string = new T.Line(
    new T.BufferGeometry().setFromPoints([points[0]!, new T.Vector3(0, 0, -0.16), points[2]!]),
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
