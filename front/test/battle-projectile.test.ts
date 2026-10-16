import { describe, expect, it } from 'vitest';

import { projectileFlightSeconds } from '../src/modules/Game/battleRangedWeapon';

describe('projectile flight timing', () => {
  it.each([true, false])('keeps constant world speed at every distance (bolt=%s)', (bolt) => {
    const near = projectileFlightSeconds(1.5, bolt);
    const far = projectileFlightSeconds(9, bolt);
    expect(far).toBeCloseTo(near * 6);
    expect(1.5 / near).toBeCloseTo(9 / far);
  });

  it('hits a nearby target quickly, with bolts faster than arrows', () => {
    expect(projectileFlightSeconds(1.5, true)).toBeLessThan(0.05);
    expect(projectileFlightSeconds(1.5, true)).toBeLessThan(projectileFlightSeconds(1.5, false));
  });

  it('never creates a negative flight duration', () => {
    expect(projectileFlightSeconds(0, true)).toBe(0);
    expect(projectileFlightSeconds(-1, true)).toBe(0);
  });
});
