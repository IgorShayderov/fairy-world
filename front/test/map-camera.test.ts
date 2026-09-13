import { describe, expect, it } from 'vitest';
import { useMapCamera } from '@/modules/Game/composables/useMapCamera';

describe('saved player camera', () => {
  it('centers the player without changing the default 1.3 zoom multiplier', () => {
    const map = useMapCamera(3000, 2000);
    map.fitToScreen(1200, 800);
    const scale = map.camera.scale;
    map.centerOn(2470, 1370, 1200, 800);
    expect(map.screenToMap(600, 400)).toEqual({ x: 2470, y: 1370 });
    expect(map.camera.scale).toBe(scale);
    expect(scale).toBe(0.4 * 1.3);
  });
});
