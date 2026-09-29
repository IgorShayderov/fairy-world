import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
