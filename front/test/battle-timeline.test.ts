import { describe, expect, it, vi } from 'vitest';

import { BattleTimeline, dampShake } from '../src/modules/Game/battleTimeline';

describe('battle timeline', () => {
  it('starts effects immediately and reaches the exact final pose before resolving', async () => {
    const clock = new BattleTimeline();
    const update = vi.fn();
    const cleanup = vi.fn();
    const completed = clock.wait(0.5, update, cleanup);
    expect(update).toHaveBeenLastCalledWith(0);
    clock.advance(0.25);
    expect(update).toHaveBeenLastCalledWith(0.5);
    clock.advance(0.3);
    expect(update).toHaveBeenLastCalledWith(1);
    await expect(completed).resolves.toBe(true);
    clock.advance(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('cancels pending work and disposes effects exactly once when the scene closes', async () => {
    const clock = new BattleTimeline();
    const update = vi.fn();
    const cleanup = vi.fn();
    const completed = clock.wait(1, update, cleanup);
    clock.advance(0.1);
    clock.dispose();
    clock.dispose();
    clock.advance(1);
    await expect(completed).resolves.toBe(false);
    expect(update).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
    // Async replay continuations cannot register new orphaned work after unmount.
    await expect(clock.wait(1, update, cleanup)).resolves.toBe(false);
    expect(update).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('handles zero duration and ignores invalid frame deltas', async () => {
    const clock = new BattleTimeline();
    const update = vi.fn();
    await expect(clock.wait(0, update)).resolves.toBe(true);
    expect(update).toHaveBeenCalledExactlyOnceWith(1);
    clock.advance(NaN);
    clock.advance(-1);
    expect(clock.time).toBe(0);
  });

  it('uses elapsed time, not frame count, for effects and camera damping', async () => {
    const sample = (fps: number) => {
      const clock = new BattleTimeline();
      let pose = 0;
      let shake = 0.22;
      void clock.wait(1, (t) => (pose = t));
      for (let i = 0; i < fps / 2; i++) {
        clock.advance(1 / fps);
        shake = dampShake(shake, 1 / fps);
      }
      return { pose, shake };
    };
    for (const fps of [30, 60, 144]) {
      expect(sample(fps).pose).toBeCloseTo(0.5);
      expect(sample(fps).shake).toBeCloseTo(sample(60).shake, 10);
    }
  });
});
