import { describe, expect, it } from 'vitest';
import { useMapCamera } from '@/modules/Game/composables/useMapCamera';

describe('saved player camera', () => {
  it('centers the player without changing the default 1.3 zoom multiplier', () => {
    const map = useMapCamera(3000, 2000);
    map.fitToScreen(1200, 800);
    const scale = map.camera.scale;
    map.centerOn(1500, 1000, 1200, 800);
    expect(map.screenToMap(600, 400)).toEqual({ x: 1500, y: 1000 });
    expect(map.camera.scale).toBe(scale);
    expect(scale).toBe(0.4 * 1.3);
  });

  it.each([[1200, 800], [500, 1000], [4000, 600]])('keeps the viewport inside the map at %i × %i', (width, height) => {
    const map = useMapCamera(3000, 2000);
    const covered = () => {
      expect(map.camera.x).toBeLessThanOrEqual(0);
      expect(map.camera.y).toBeLessThanOrEqual(0);
      expect(map.camera.x + 3000 * map.camera.scale).toBeGreaterThanOrEqual(width - 1e-8);
      expect(map.camera.y + 2000 * map.camera.scale).toBeGreaterThanOrEqual(height - 1e-8);
    };
    map.fitToScreen(width, height);
    for (const direction of [-1, 1]) {
      map.startDrag(0, 0);
      map.doDrag(direction * 100000, direction * 100000);
      map.endDrag(0, 0);
      covered();
      map.centerOn(direction * 10000, direction * 10000, width, height);
      covered();
    }
    for (let i = 0; i < 100; i++) {
      map.zoomAt(width, 0, 100);
      covered();
    }
    map.zoomBy(-100, width, height);
    covered();
    expect(map.camera.scale).toBe(Math.max(width / 3000, height / 2000));
    map.zoomBy(1, width, height);
    covered();
    map.fitToScreen(height, width);
    expect(map.camera.x + 3000 * map.camera.scale).toBeGreaterThanOrEqual(height);
    expect(map.camera.y + 2000 * map.camera.scale).toBeGreaterThanOrEqual(width);
  });
});
