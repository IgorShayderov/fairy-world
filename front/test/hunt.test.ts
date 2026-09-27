import { describe, expect, it } from 'vitest';

import { rollHuntDelaySeconds } from '@/modules/Game/hunt';

describe('hunt', () => {
  it('rolls an inclusive delay between one and ten seconds', () => {
    expect(rollHuntDelaySeconds(() => 0)).toBe(1);
    expect(rollHuntDelaySeconds(() => 0.49)).toBe(5);
    expect(rollHuntDelaySeconds(() => 0.999999)).toBe(10);
  });

  it('clamps unexpected random values to the supported range', () => {
    expect(rollHuntDelaySeconds(() => -1)).toBe(1);
    expect(rollHuntDelaySeconds(() => 2)).toBe(10);
  });
});
