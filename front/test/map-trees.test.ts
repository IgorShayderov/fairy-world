import { describe, expect, it } from 'vitest';

import { frozenLakes, isTreeInWater, lakes, rivers } from '@/modules/Game/composables/useMapObjects';

describe('forest water clearance', () => {
  it('rejects trunks along the rendered river curves', () => {
    for (const points of rivers) {
      let start = points[0]!;
      for (let index = 1; index < points.length - 1; index++) {
        const control = points[index]!;
        const next = points[index + 1]!;
        const end = index === points.length - 2 ? next : { x: (control.x + next.x) / 2, y: (control.y + next.y) / 2 };
        for (const t of [0, 0.15, 0.5, 0.85, 1]) {
          const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x;
          const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y;
          for (const size of [22, 46]) {
            expect(isTreeInWater(x, y - size * 0.32, size)).toBe(true);
          }
        }
        start = end;
      }
    }
  });

  it('rejects trees inside rotated lakes and permits nearby dry land', () => {
    for (const lake of [...lakes, ...frozenLakes]) {
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const localX = Math.cos(angle) * lake.rx * 0.99;
        const localY = Math.sin(angle) * lake.ry * 0.99;
        const x = lake.x + localX * Math.cos(lake.angle) - localY * Math.sin(lake.angle);
        const y = lake.y + localX * Math.sin(lake.angle) + localY * Math.cos(lake.angle);
        expect(isTreeInWater(x, y - 32 * 0.32, 32)).toBe(true);
      }
    }
    expect(isTreeInWater(360, 1010, 32)).toBe(false);
    expect(isTreeInWater(790, 1220, 32)).toBe(false);
  });
});
