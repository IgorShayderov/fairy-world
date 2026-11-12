import { Bone, Quaternion, Vector3 } from 'three';

import type { Object3D } from 'three';

import { hitReactionWeight, hitRecoveryWeight } from './battleAnimation';

/** Offset the live animated pose, with the head/shoulders following the torso's impact. */
export function createCreatureHitPose(root: Object3D, direction: Vector3, strength = 1) {
  const bones: Bone[] = [];
  root.traverse((node) => {
    if (node instanceof Bone) bones.push(node);
  });
  const nameOf = (bone: Bone) => bone.name.toLowerCase().replace(/^rig[_ :]*|^mixamorig[:_]?/g, '').replace(/[ _.-]/g, '');
  const pick = (names: string[]) => names.map((name) => bones.find((bone) => nameOf(bone) === name)).find(Boolean);
  const torso = pick(['chest', 'spine3', 'spine1', 'back', 'back2', 'body', 'spine', 'neck1']);
  const lowerSpine = pick(['spine', 'lowerback', 'back1']);
  const head = pick(['head', 'skull', 'neck3', 'neck', 'eye']);
  const shoulders = bones.filter((bone) =>
    /^(?:shoulder(?:l|r|left|right)|(?:left|right)shoulder|upperwing(?:l|r))$/.test(nameOf(bone))
  );
  const worldAxis = new Vector3(direction.z, 0, -direction.x).normalize();
  const splitSpine = lowerSpine && lowerSpine !== torso;
  const entries = [
    ...(splitSpine ? [{ bone: lowerSpine, angle: 0.1, delay: 0 }] : []),
    ...(torso ? [{ bone: torso, angle: splitSpine ? 0.16 : 0.26, delay: 0.025 }] : []),
    ...(head ? [{ bone: head, angle: 0.15, delay: 0.085 }] : []),
    ...shoulders.map((bone) => ({ bone, angle: -0.1, delay: 0.055 })),
  ].map(({ bone, angle, delay }) => ({
    bone,
    angle: angle * strength,
    delay,
    base: bone.quaternion.clone(),
  }));
  const rotation = new Quaternion();
  const parentRotation = new Quaternion();
  const axis = new Vector3();
  let applied = false;
  const restore = () => {
    if (!applied) return;
    for (const entry of entries) entry.bone.quaternion.copy(entry.base);
    applied = false;
  };
  return {
    articulated: entries.length > 0,
    apply(progress: number) {
      restore();
      // Snapshot all bones before modifying parents. The render loop removes
      // the previous offset before advancing the mixer, so idle/hurt motion
      // keeps playing underneath rather than being frozen at the impact pose.
      for (const entry of entries) entry.base.copy(entry.bone.quaternion);
      for (const entry of entries) {
        const phase = (progress - entry.delay) / (1 - entry.delay);
        // Follow-through, then a restrained counter-bend rather than a rigid
        // slide back to idle. Delayed joints settle at different times.
        const weight = hitReactionWeight(phase) - 0.3 * hitRecoveryWeight(phase);
        entry.bone.parent!.getWorldQuaternion(parentRotation).invert();
        axis.copy(worldAxis).applyQuaternion(parentRotation);
        rotation.setFromAxisAngle(axis, entry.angle * weight);
        entry.bone.quaternion.premultiply(rotation);
      }
      applied = true;
    },
    restore,
  };
}
