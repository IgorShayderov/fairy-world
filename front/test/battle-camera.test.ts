import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { fitBattleCamera } from '../src/modules/Game/battleCamera';

describe('battlefield camera framing', () => {
  it.each([[1728, 900], [1440, 650], [1024, 900], [650, 700], [390, 600]])(
    'keeps every edge hex and tall model visible at %sx%s', (width, height) => {
      const columns = 11, rows = 7;
      const cells = Array.from({ length: columns * rows }, (_, i) => {
        const row = Math.floor(i / columns);
        return new Vector3(((i % columns) + (row % 2) / 2 - columns / 2) * 1.77, 0.12, (row - rows / 2) * 1.53);
      });
      const camera = new PerspectiveCamera(36, width / height, .1, 160);
      const { target, distance } = fitBattleCamera(camera, cells);
      expect(camera.position.distanceTo(target)).toBeCloseTo(distance);
      // Tall bosses and broad models still fit, without the old oversized empty border.
      if (width === 1728) expect(distance).toBeLessThan(41);
      for (const cell of cells) for (const y of [0, 4]) for (const x of [-1.8, 1.8]) {
        const projected = cell.clone().add(new Vector3(x, y, 0)).project(camera);
        expect(Math.abs(projected.x)).toBeLessThanOrEqual(.9);
        expect(Math.abs(projected.y)).toBeLessThanOrEqual(.8);
        expect(projected.z).toBeLessThan(1);
      }
    }
  );
});
