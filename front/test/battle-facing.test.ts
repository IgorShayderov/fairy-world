import { Object3D, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { faceBattleTarget, planarFacingAngle } from '../src/modules/Game/battleAnimation';

describe('battle facing after hit reactions', () => {
  it.each([0, 45, 90, 135, 180, 225, 270, 315])('faces the enemy at %s degrees after quaternion restoration', (degrees) => {
    const root = new Object3D();
    root.position.set(0, 0, 8); // Bottom-row hex.
    const yaw = degrees * Math.PI / 180;
    root.rotation.set(0, yaw, 0);
    const saved = root.quaternion.clone();
    root.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.12));
    root.quaternion.copy(saved); // Hit recovery decomposes rotation into equivalent Euler angles.
    const forward = new Vector3(0, 0, 1).applyQuaternion(root.quaternion);
    expect(Math.sin(planarFacingAngle(root.quaternion))).toBeCloseTo(forward.x);
    expect(Math.cos(planarFacingAngle(root.quaternion))).toBeCloseTo(forward.z);
    const destination = new Vector3(2, 0, -4);
    faceBattleTarget(root, destination);
    const expected = destination.clone().sub(root.position).normalize();
    expect(new Vector3(0, 0, 1).applyQuaternion(root.quaternion).dot(expected)).toBeCloseTo(1);
    expect(root.rotation.x).toBe(0);
    expect(root.rotation.z).toBe(0);
  });
});
