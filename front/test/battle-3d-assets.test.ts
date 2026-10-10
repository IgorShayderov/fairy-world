import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

function model(name: string) {
  const bytes = readFileSync(new URL(`../public/models/battle/${name}.glb`, import.meta.url));
  expect(bytes.toString('utf8', 0, 4)).toBe('glTF');
  return JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12))) as {
    animations: { name: string }[];
    nodes: { name: string }[];
    skins: unknown[];
    buffers: { uri?: string }[];
  };
}

describe('redistributable 3D battle assets', () => {
  it('exports real skeletal motion, not just animation names, for the dragon', () => {
    const bytes = readFileSync(new URL('../public/models/battle/creatures/dragon.glb', import.meta.url));
    const jsonLength = bytes.readUInt32LE(12);
    const asset = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
    const binaryOffset = 28 + jsonLength;
    for (const name of ['Idle', 'Walk', 'Attack', 'Death']) {
      const animation = asset.animations.find((entry: { name: string }) => entry.name === name);
      expect(animation, name).toBeDefined();
      const movingTracks = animation.samplers.filter((sampler: { output: number }) => {
        const accessor = asset.accessors[sampler.output];
        const view = asset.bufferViews[accessor.bufferView];
        const width = accessor.type === 'VEC4' ? 4 : 3;
        const offset = binaryOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        for (let frame = 1; frame < accessor.count; frame++) {
          for (let component = 0; component < width; component++) {
            const first = bytes.readFloatLE(offset + component * 4);
            const next = bytes.readFloatLE(offset + (frame * width + component) * 4);
            if (Math.abs(next - first) > 0.001) return true;
          }
        }
        return false;
      });
      expect(movingTracks.length, `${name} must deform multiple joints`).toBeGreaterThan(8);
    }
  });

  it('ships the realistic knight with equipment-specific combat and fall animations', () => {
    const knight = model('solus-knight');
    expect(knight.skins.length).toBeGreaterThan(0);
    expect(knight.animations.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        'knight_walk_in_place',
        'knight_idle_heavy_weapon',
        'knight_attack_2_heavy_weapon',
        'two_weapon_attack_sequence',
        'knight_front_attacked_fall',
        'knight_shield_block',
      ])
    );
    expect(knight.nodes.map((entry) => entry.name)).toEqual(expect.arrayContaining(['Rig_hand_R', 'Rig_hand_L']));
  });
  it('has rigged models with embedded data, movement, attack and death clips', () => {
    for (const name of ['kaykit-knight', 'kaykit-skeleton', 'demon', 'ghost']) {
      const asset = model(name);
      const clips = asset.animations.map((entry) => entry.name);
      expect(asset.skins.length).toBeGreaterThan(0);
      expect(asset.buffers.every((buffer) => !buffer.uri)).toBe(true);
      expect(clips.some((clip) => /walk|flying/i.test(clip))).toBe(true);
      expect(clips.some((clip) => /attack|weapon|headbutt/i.test(clip))).toBe(true);
      expect(clips.some((clip) => /death/i.test(clip))).toBe(true);
    }
  });
  it('supports actual equipment-specific knight animations', () => {
    const knight = model('kaykit-knight');
    expect(knight.animations.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        '2H_Melee_Idle',
        '2H_Melee_Attack_Slice',
        '1H_Melee_Attack_Slice_Diagonal',
        'Dualwield_Melee_Attack_Slice',
        'Unarmed_Melee_Attack_Punch_A',
        'Death_A',
      ])
    );
    expect(knight.nodes.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['2H_Sword', '1H_Sword', 'Badge_Shield'])
    );
  });
});
