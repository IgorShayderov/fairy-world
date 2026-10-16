import { AnimationClip, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';

import {
  attackOffset,
  attackTiming,
  inPlacePlayerClips,
  safeLungeDistance,
  skeletonAttackClips,
  smoothStep,
  usesReversingIdle,
} from '../src/modules/Game/battleAnimation';

describe('battle animation pacing', () => {
  it('makes skeleton strikes faster and crisper without speeding up other monsters', () => {
    const skeleton = attackTiming('Attack', false, 'bone-knight');
    const other = attackTiming('Attack', false, 'minotaur');
    expect(skeleton.duration).toBe(0.72);
    expect(skeleton.duration * skeleton.impact).toBeCloseTo(0.28);
    expect(skeleton.blend).toBe(0.025);
    expect(other.duration).toBe(0.9);
    expect(other.blend).toBe(0.08);
    expect(usesReversingIdle('bone-knight')).toBe(true);
  });
  it('gives the skeleton a guard, wind-up, fast cut and recovery without altering the source clips', () => {
    const idle = new AnimationClip('Idle', 1, [
      new VectorKeyframeTrack('Hand.Right.position', [0, 1], [0, 0, 0, 0, 0, 0]),
    ]);
    const attack = new AnimationClip('Attack', 0.8, [
      new VectorKeyframeTrack('Hand.Right.position', [0, 0.8 / 3, 0.8], [1, 0, 0, 2, 0, 0, 3, 0, 0]),
    ]);
    const clips = [idle, attack];
    const result = skeletonAttackClips(clips, 'bone-knight')[1]!;
    const track = result.tracks[0]!;
    expect(Array.from(track.times)).toEqual([0, 0.18, 0.22, 0.28, 0.4, 0.44, 0.72].map(Math.fround));
    expect(Array.from(track.values).filter((_, i) => i % 3 === 0)).toEqual([0, 1, 1, 2, 3, 3, 0]);
    expect(result.duration).toBe(0.72);
    expect(result.validate()).toBe(true);
    expect(attack.duration).toBe(0.8);
    expect(attack.tracks[0]!.times.length).toBe(3);
    expect(skeletonAttackClips(clips, 'minotaur')).toBe(clips);
    expect(skeletonAttackClips([attack], 'bone-knight')[0]).toBe(attack);
  });
  it('reverses incomplete minotaur and skeleton idle cycles without changing complete loops', () => {
    expect(usesReversingIdle('minotaur')).toBe(true);
    expect(usesReversingIdle('bone-knight')).toBe(true);
    expect(usesReversingIdle('dragon')).toBe(false);
    expect(usesReversingIdle('solus-knight')).toBe(false);
  });
  it('removes baked forward movement without losing vertical motion or mutating the original clip', () => {
    const idle = new AnimationClip('knight_idle_heavy_weapon', 1, [
      new VectorKeyframeTrack('Rig_Hips.position', [0, 1], [0, 1, 0, 0, 1, 0]),
    ]);
    const attack = new AnimationClip('knight_attack_2_heavy_weapon', 1, [
      new VectorKeyframeTrack('Rig_Hips.position', [0, 1], [0.1, 1, 0.2, 0.3, 1.2, 1.1]),
    ]);
    const result = inPlacePlayerClips([idle, attack])[1]!.tracks[0]!.values;
    expect(result[0]).toBe(0);
    expect(result[2]).toBe(0);
    expect(result[3]).toBe(0);
    expect(result[5]).toBe(0);
    expect(result[4]).toBeCloseTo(1.2);
    expect(attack.tracks[0]!.values[5]).toBeCloseTo(1.1);
  });
  it('does not lunge into a large enemy or move backwards when there is no room', () => {
    expect(safeLungeDistance(1.77, 0.55, 1.1, true)).toBe(0);
    expect(safeLungeDistance(1.77, 0.55, 0.8, false)).toBeCloseTo(0.2);
    expect(safeLungeDistance(3, 0.55, 0.8, true)).toBe(0.52);
  });
  it('winds up, strikes, holds contact and returns exactly home', () => {
    expect(attackOffset(0)).toBe(0);
    expect(attackOffset(0.24)).toBeCloseTo(-0.12);
    expect(attackOffset(0.48)).toBe(1);
    expect(attackOffset(0.53)).toBe(1);
    expect(attackOffset(1)).toBe(0);
  });
  it('gives heavy and power attacks more weight without stretching ordinary attacks', () => {
    expect(attackTiming('knight_attack_2_heavy_weapon', false).duration).toBeGreaterThan(
      attackTiming('Attack', false).duration
    );
    expect(attackTiming('Attack', true).duration).toBeGreaterThan(attackTiming('Attack', false).duration);
  });
  it('clamps smooth turns at their endpoints', () => {
    expect(smoothStep(-1)).toBe(0);
    expect(smoothStep(0.5)).toBe(0.5);
    expect(smoothStep(2)).toBe(1);
  });
});
