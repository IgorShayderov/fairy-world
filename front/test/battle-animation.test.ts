import { describe, expect, it } from 'vitest';

import { attackOffset, attackTiming, smoothStep } from '../src/modules/Game/battleAnimation';

describe('battle animation pacing', () => {
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
