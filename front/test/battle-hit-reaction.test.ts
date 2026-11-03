import { readFileSync } from 'node:fs';
import { Bone, Group, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCreatureHitPose } from '../src/modules/Game/battleHitReaction';

describe('creature skeletal hit reactions', () => {
  it.each(['Back', 'Spine1', 'spine_3', 'chest', 'body', 'back2', 'Rig_Chest', 'mixamorig:Spine1'])(
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

  it('lets the head follow the torso instead of moving every joint at the same time', () => {
    const root = new Group(), torso = new Bone(), head = new Bone();
    torso.name = 'Rig_Chest';
    head.name = 'Rig_Head';
    root.add(torso);
    torso.add(head);
    const pose = createCreatureHitPose(root, new Vector3(0, 0, -1));
    pose.apply(0.07);
    expect(torso.quaternion.angleTo(new Quaternion())).toBeGreaterThan(0.01);
    expect(head.quaternion.angleTo(new Quaternion())).toBeCloseTo(0);
    pose.apply(0.25);
    expect(head.quaternion.angleTo(new Quaternion())).toBeGreaterThan(0.05);
  });

  it('layers on the live animation and restores it before the next mixer frame', () => {
    const root = new Group(), torso = new Bone();
    torso.name = 'Chest';
    root.add(torso);
    const pose = createCreatureHitPose(root, new Vector3(0, 0, -1));
    pose.apply(0.2);
    pose.restore();
    const animatedBase = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.4);
    torso.quaternion.copy(animatedBase);
    pose.apply(0.5);
    expect(torso.quaternion.angleTo(animatedBase)).toBeGreaterThan(0.1);
    pose.restore();
    expect(torso.quaternion.angleTo(animatedBase)).toBeCloseTo(0);
    pose.restore();
    expect(torso.quaternion.angleTo(animatedBase)).toBeCloseTo(0);
  });

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('recoils away from the hit at facing %s', (yaw) => {
    const root = new Group(), torso = new Bone();
    root.rotation.y = yaw;
    torso.name = 'Chest';
    root.add(torso);
    const direction = new Vector3(0, 0, -1);
    const pose = createCreatureHitPose(root, direction);
    pose.apply(0.25);
    const up = new Vector3(0, 1, 0).applyQuaternion(torso.getWorldQuaternion(new Quaternion()));
    expect(up.dot(direction)).toBeGreaterThan(0.1);
    pose.restore();
    expect(root.rotation.y).toBe(yaw);
  });

  it.each(['solus-knight', 'creatures/goblin', 'creatures/wolf', 'creatures/golem', 'creatures/harpy', 'creatures/wraith', 'creatures/minotaur', 'creatures/bone-knight', 'creatures/dragon'])(
    'recognizes actual joints in %s', (model) => {
      const data = readFileSync(new URL(`../public/models/battle/${model}.glb`, import.meta.url));
      const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString()) as {
        nodes: { name?: string }[]; skins: { joints: number[] }[];
      };
      const root = new Group();
      for (const joint of new Set(gltf.skins.flatMap((skin) => skin.joints))) {
        const bone = new Bone();
        bone.name = gltf.nodes[joint]?.name ?? '';
        root.add(bone);
      }
      const pose = createCreatureHitPose(root, new Vector3(1, 0, 0));
      expect(pose.articulated).toBe(true);
      pose.apply(0.25);
      expect(root.children.filter((bone) => bone.quaternion.angleTo(new Quaternion()) > 0.01).length).toBeGreaterThanOrEqual(2);
      pose.restore();
      expect(root.children.every((bone) => bone.quaternion.angleTo(new Quaternion()) < 0.0001)).toBe(true);
    }
  );
});
