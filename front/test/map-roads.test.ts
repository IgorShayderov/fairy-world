import { describe, expect, it } from 'vitest';
import { isPointOnRoute, landmarks, mountains, roads } from '@/modules/Game/composables/useMapObjects';

describe('map roads', () => {
  it('recognizes positions on and away from a route', () => {
    expect(isPointOnRoute(730, 735)).toBe(true);
    expect(isPointOnRoute(730, 760)).toBe(false);
  });
  it('connects every landmark using named endpoints', () => {
    for (const landmark of landmarks) {
      expect(roads.some((road) => road[0] === landmark || road.at(-1) === landmark)).toBe(true);
    }
  });

  it('never crosses a drawn mountain, including the road stroke', () => {
    for (const road of roads) {
      for (let index = 1; index < road.length; index++) {
        const a = road[index - 1]!;
        const b = road[index]!;
        const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
        for (let step = 0; step <= steps; step++) {
          const x = a.x + (b.x - a.x) * step / steps;
          const y = a.y + (b.y - a.y) * step / steps;
          for (const mountain of mountains) {
            const dy = y - mountain.y;
            const fraction = (dy + mountain.size) / (1.34 * mountain.size);
            if (fraction < 0 || fraction > 1) continue;
            const inside = x > mountain.x - .7 * mountain.size * fraction - 6
              && x < mountain.x + .78 * mountain.size * fraction + 6;
            expect(inside, `Road ${JSON.stringify(a)} → ${JSON.stringify(b)} crosses mountain at ${mountain.x},${mountain.y}`).toBe(false);
          }
        }
      }
    }
  });
});
