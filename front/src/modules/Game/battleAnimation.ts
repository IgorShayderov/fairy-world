import type { AnimationClip } from 'three';

/** These legacy exports contain one half of an idle cycle, not a closed loop. */
export function usesReversingIdle(model: string): boolean {
  return model === 'bone-knight' || model === 'minotaur';
}

export function smoothStep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Wind-up, contact, brief follow-through, then recovery. */
export function attackOffset(progress: number, impact = 0.48): number {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < impact * 0.5) return -0.12 * smoothStep(progress / (impact * 0.5));
  if (progress < impact) return -0.12 + 1.12 * smoothStep((progress - impact * 0.5) / (impact * 0.5));
  const recoveryStart = impact + 0.1;
  if (progress < recoveryStart) return 1;
  return 1 - smoothStep((progress - recoveryStart) / (1 - recoveryStart));
}

export function attackTiming(clipName: string, power: boolean, model?: string) {
  // Match the contact pose in skeletonAttackClips (source frame 14).
  if (model === 'bone-knight') return { duration: 0.72, impact: 0.28 / 0.72, blend: 0.025 };
  const heavy = /heavy_weapon|Weapon|Chop/i.test(clipName);
  return { duration: power ? 1.35 : heavy ? 1.12 : 0.9, impact: heavy ? 0.52 : 0.45, blend: 0.08 };
}

/** The legacy clip contains only the sweep, with no anticipation or recovery.
 * Keep its authored bone poses, but cut in 180ms instead of stretching the
 * whole sweep. Animate from/to the guard pose rather than snapping into it.
 */
export function skeletonAttackClips(clips: AnimationClip[], model: string): AnimationClip[] {
  if (model !== 'bone-knight') return clips;
  const idle = clips.find((clip) => clip.name === 'Idle');
  return clips.map((source) => {
    if (source.name !== 'Attack' || source.duration <= 0 || !idle) return source;
    const attack = source.clone();
    attack.duration = 0.72;
    attack.tracks = source.tracks.map((track) => {
      const guard = idle.tracks.find((entry) => entry.name === track.name);
      if (!guard) return track.clone();
      const result = track.clone();
      const width = track.getValueSize();
      const guardPose = Array.from(guard.values.slice(0, width));
      const windup = Array.from(track.values.slice(0, width));
      const followThrough = Array.from(track.values.slice(-width));
      result.times = new Float32Array([
        0,
        0.18,
        ...Array.from(track.times, (time) => 0.22 + (time / source.duration) * 0.18),
        0.44,
        0.72,
      ]);
      result.values = new Float32Array([...guardPose, ...windup, ...track.values, ...followThrough, ...guardPose]);
      return result;
    });
    return attack;
  });
}

/** Movement is controlled by the hex path/lunge, not by translation baked into the rig. */
export function inPlacePlayerClips(clips: AnimationClip[]): AnimationClip[] {
  const idle = clips.find((clip) => clip.name === 'knight_idle_heavy_weapon');
  const reference = idle?.tracks.find((track) => track.name === 'Rig_Hips.position');
  return clips.map((source) => {
    const clip = source.clone();
    if (/fall|death/i.test(clip.name)) return clip;
    const hips = clip.tracks.find((track) => track.name === 'Rig_Hips.position');
    if (!hips) return clip;
    const x = reference?.values[0] ?? hips.values[0] ?? 0;
    const z = reference?.values[2] ?? hips.values[2] ?? 0;
    for (let i = 0; i < hips.values.length; i += 3) {
      hips.values[i] = x;
      hips.values[i + 2] = z;
    }
    return clip;
  });
}

export function safeLungeDistance(distance: number, attackerRadius: number, targetRadius: number, power: boolean) {
  return Math.max(0, Math.min(power ? 0.52 : 0.32, distance - attackerRadius - targetRadius - 0.22));
}
