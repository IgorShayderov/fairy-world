import { describe, expect, it } from 'vitest';
import { taskProgress } from '@/modules/Castles/presentation';
describe('castle timed tasks', () => {
  it('reports elapsed time and clamps ready and future tasks', () => {
    const end = new Date(120000).toISOString();
    expect(taskProgress(end, 120, 0)).toBe(0);
    expect(taskProgress(end, 120, 60000)).toBe(50);
    expect(taskProgress(end, 120, 180000)).toBe(100);
    expect(taskProgress(end, 120, -60000)).toBe(0);
    expect(taskProgress(null, 120, 0)).toBe(0);
  });
});
