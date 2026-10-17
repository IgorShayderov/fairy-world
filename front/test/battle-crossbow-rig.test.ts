import { readFileSync } from 'node:fs';

import { AnimationMixer, Box3, Group, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { expect, it } from 'vitest';

import { attackOffset, inPlacePlayerClips } from '../src/modules/Game/battleAnimation';
import { palmGrip } from '../src/modules/Game/battleHeavyWeapon';
import { CROSSBOW_LEFT_GRIP, CROSSBOW_RIGHT_GRIP, updateCrossbowGrip } from '../src/modules/Game/battleRangedWeapon';

it('keeps the crossbow attached across the actual knight animation poses', async () => {
  const file = readFileSync(new URL('../public/models/battle/solus-knight.glb', import.meta.url));
  const jsonLength = file.readUInt32LE(12);
  const data = JSON.parse(file.subarray(20, 20 + jsonLength).toString()) as {
    materials?: unknown[];
    meshes: Array<{ primitives: Array<{ material?: number }> }>;
  };
  // No texture decoding is needed for this skeletal attachment regression test.
  delete data.materials;
  for (const mesh of data.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  const json = Buffer.from(JSON.stringify(data));
  const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const header = Buffer.from(file.subarray(0, 20));
  const binary = file.subarray(20 + jsonLength);
  header.writeUInt32LE(20 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12);
  const input = Buffer.concat([header, padded, binary]);
  const gltf = await new GLTFLoader().parseAsync(
    input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
    ''
  );
  const model = gltf.scene;
  const clips = inPlacePlayerClips(gltf.animations);
  const mixer = new AnimationMixer(model);
  mixer.clipAction(clips.find((clip) => clip.name === 'knight_idle_heavy_weapon')!).play();
  mixer.update(0.01);
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      object.skeleton.update();
      object.computeBoundingBox();
    }
  });
  const box = new Box3().setFromObject(model);
  const scale = 2.5 / box.getSize(new Vector3()).y;
  model.scale.multiplyScalar(scale);
  model.position.y -= box.min.y * scale;
  const root = new Group();
  root.add(model);
  const weapon = new Group();
  updateCrossbowGrip(root, weapon);
  for (const name of [
    'knight_idle',
    'knight_walk_in_place',
    'knight_hurt_left',
    'knight_shield_block',
    'knight_shield_attack',
  ]) {
    const clip = clips.find((entry) => entry.name === name)!;
    expect(clip, name).toBeDefined();
    const positions: Vector3[] = [];
    for (const fraction of Array.from({ length: 21 }, (_, i) => Math.min(i / 20, 0.99))) {
      mixer.stopAllAction();
      mixer.clipAction(clip).reset().play();
      mixer.update(clip.duration * fraction);
      updateCrossbowGrip(root, weapon, name === 'knight_shield_attack' ? attackOffset(fraction, 0.45) * 0.3 : 0);
      positions.push(weapon.position.clone());
      for (const [side, socket] of [
        ['R', CROSSBOW_RIGHT_GRIP],
        ['L', CROSSBOW_LEFT_GRIP],
      ] as const) {
        const palm = root.getObjectByName(`Rig_hand_${side}`)!.localToWorld(palmGrip.clone());
        expect
          .soft(palm.distanceTo(weapon.localToWorld(socket.clone())), `${name} ${fraction} ${side}`)
          .toBeLessThan(0.015);
      }
    }
    if (name === 'knight_walk_in_place') {
      expect(new Box3().setFromPoints(positions).getSize(new Vector3()).length()).toBeGreaterThan(0.02);
    }
  }
});
