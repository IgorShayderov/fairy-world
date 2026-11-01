import { Bone, Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCreatureHitPose } from '../src/modules/Game/battleHitReaction';

describe('creature skeletal hit reactions', () => {
  it.each(['Back', 'Spine1', 'spine_3', 'chest', 'body', 'back2'])(
    'bends %s rigs and restores their exact pose without accumulating rotations',
    (name) => {
      const root = new Group(),
        torso = new Bone(),
        head = new Bone();
      torso.name = name;
      head.name = 'Head';
      root.add(torso);
      torso.add(head);
      const original = torso.quaternion.clone();
      const pose = createCreatureHitPose(root, new Vector3(1, 0, 0));
      pose.apply(0.2);
      const recoil = torso.quaternion.clone();
      expect(recoil.angleTo(original)).toBeGreaterThan(0.1);
      pose.apply(0.2);
      expect(torso.quaternion.angleTo(recoil)).toBeCloseTo(0);
      pose.apply(1);
      pose.restore();
      expect(torso.quaternion.angleTo(original)).toBeCloseTo(0);
      expect(root.position.length()).toBe(0);
    }
  );
});
