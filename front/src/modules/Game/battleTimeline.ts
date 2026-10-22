type Tween = {
  start: number;
  duration: number;
  update: ((progress: number) => void) | undefined;
  cleanup: (() => void) | undefined;
  resolve: (completed: boolean) => void;
};

/** All presentation uses the same clock as the skeletal mixers, including VFX.
 * Closing the scene cancels pending work without leaving unresolved promises.
 */
export class BattleTimeline {
  time = 0;
  private closed = false;
  private tweens = new Set<Tween>();

  wait(duration: number, update?: Tween['update'], cleanup?: Tween['cleanup']): Promise<boolean> {
    if (this.closed) {
      cleanup?.();
      return Promise.resolve(false);
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      update?.(1);
      cleanup?.();
      return Promise.resolve(true);
    }
    update?.(0);
    return new Promise((resolve) => {
      this.tweens.add({ start: this.time, duration, update, cleanup, resolve });
    });
  }

  advance(delta: number) {
    if (this.closed || !Number.isFinite(delta) || delta < 0) return;
    this.time += delta;
    for (const tween of [...this.tweens]) {
      const progress = Math.min(1, (this.time - tween.start) / tween.duration);
      tween.update?.(progress);
      if (progress >= 1) {
        this.tweens.delete(tween);
        tween.cleanup?.();
        tween.resolve(true);
      }
    }
  }

  dispose() {
    this.closed = true;
    for (const tween of this.tweens) {
      tween.cleanup?.();
      tween.resolve(false);
    }
    this.tweens.clear();
  }
}

/** Exponential damping independent of display refresh rate. */
export function dampShake(intensity: number, delta: number): number {
  return intensity * Math.pow(0.82, Math.max(0, delta) * 60);
}
