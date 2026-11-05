import { describe, expect, it } from 'vitest';
import { remainingTime, selectedPower, usedCapacity } from '../src/modules/Castles/presentation';
import type { Castle } from '../src/modules/Castles/api';

describe('castle presentation', () => {
  it('counts ready, training and deployed units', () => {
    expect(
      usedCapacity({
        sentinels: 10,
        rangers: 2,
        arcanists: 1,
        trainingCount: 5,
        raidSentinels: 4,
        raidRangers: 3,
        raidArcanists: 2,
      } as Castle)
    ).toBe(27);
  });
  it('calculates expedition strength with forge bonus', () => {
    expect(selectedPower({ sentinels: 10, rangers: 5, arcanists: 2 }, 2)).toBe(273);
  });
  it('uses server-relative countdowns and never shows negative time', () => {
    const now = Date.parse('2026-11-03T12:00:00Z');
    expect(remainingTime(null, now)).toBe('');
    expect(remainingTime('2026-11-03T11:00:00Z', now)).toBe('Finishing…');
    expect(remainingTime('2026-11-03T12:02:01Z', now)).toBe('2m 1s');
    expect(remainingTime('2026-11-03T13:30:00Z', now)).toBe('1h 30m');
  });
});
