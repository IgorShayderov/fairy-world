import { Bone, Quaternion, Vector3 } from 'three';

import type { Object3D} from 'three';

import { hitReactionWeight } from './battleAnimation';

/** Bend creature rigs which have no authored hurt clip, instead of sliding a rigid model. */
export function createCreatureHitPose(root: Object3D, direction: Vector3, strength = 1) {
  const bones: Bone[] = [];
  root.traverse((node) => {
    if (node instanceof Bone) bones.push(node);
  });
  const pick = (names: string[]) =>
    names.map((name) => bones.find((bone) => bone.name.toLowerCase() === name)).find(Boolean);
  const torso = pick(['chest', 'spine3', 'spine_3', 'spine1', 'back', 'back2', 'body', 'spine']);
  const head = pick(['head', 'skull', 'neck3', 'neck', 'eye']);
  const arms = bones.filter((bone) =>
    /^(?:upperarm[._]|upper_arm[._]|leftarm$|rightarm$|upperwing[._])/i.test(bone.name)
  );
  root.updateMatrixWorld(true);
  const worldAxis = new Vector3(direction.z, 0, -direction.x).normalize();
  const entries = [
    ...(torso ? [{ bone: torso, angle: 0.24 * strength }] : []),
    ...(head ? [{ bone: head, angle: -0.13 * strength }] : []),
    ...arms.map((bone) => ({ bone, angle: -0.12 * strength })),
  ].map(({ bone, angle }) => ({
    bone,
    angle,
    initial: bone.quaternion.clone(),
    axis: worldAxis.clone().applyQuaternion(bone.parent!.getWorldQuaternion(new Quaternion()).invert()),
  }));
  const rotation = new Quaternion();
  return {
    apply(progress: number) {
      const weight = hitReactionWeight(progress);
      for (const entry of entries) {
        rotation.setFromAxisAngle(entry.axis, entry.angle * weight);
        entry.bone.quaternion.copy(entry.initial).premultiply(rotation);
      }
    },
    restore() {
      for (const entry of entries) entry.bone.quaternion.copy(entry.initial);
    },
  };
}
