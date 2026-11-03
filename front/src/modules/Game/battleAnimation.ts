import { type AnimationAction, type AnimationClip, type AnimationMixer, type Object3D, type Quaternion, LoopOnce, LoopRepeat, Vector3 } from 'three';

/** Euler Y alone becomes ambiguous after a hit quaternion crosses the rear half-plane. */
export function planarFacingAngle(rotation: Quaternion): number {
  const forward = new Vector3(0, 0, 1).applyQuaternion(rotation);
  return Math.atan2(forward.x, forward.z);
}

export function faceBattleTarget(root: Object3D, destination: { x: number; z: number }): void {
  const dx = destination.x - root.position.x;
  const dz = destination.z - root.position.z;
  if (Math.hypot(dx, dz) < 0.0001) return;
  // Reset pitch/roll left by quaternion-to-Euler decomposition, not just yaw.
  root.rotation.set(0, Math.atan2(dx, dz), 0);
}

/** Reusing an idle clip for aiming/casting must not fade that same pose to zero. */
export function transitionBattleAction(
  mixer: AnimationMixer,
  current: AnimationAction | undefined,
  animation: AnimationClip,
  once = false,
  duration?: number,
  blend = once ? 0.08 : 0.18
): AnimationAction {
  const action = mixer.clipAction(animation);
  if (!once && current === action && action.isRunning() && action.loop !== LoopOnce) return action;
  const samePose = current === action;
  if (!samePose) current?.fadeOut(blend);
  action
    .reset()
    .setEffectiveTimeScale(duration ? animation.duration / duration : 1)
    .setEffectiveWeight(1);
  action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
  action.clampWhenFinished = once;
  // A new scene also needs a fully weighted initial pose, never the bind pose.
  if (current && !samePose) action.fadeIn(blend);
  else action.stopFading();
  return action.play();
}

/** These legacy exports contain one half of an idle cycle, not a closed loop. */
export function usesReversingIdle(model: string): boolean {
  return model === 'bone-knight' || model === 'minotaur';
}

/** Authored combat runs, with stride cadence matched to faster visual travel. */
export function playerRunClip(twoHanded: boolean): string {
  return twoHanded ? 'knight_run_heavy_weapon_in_place' : 'knight_run_shield';
}
export const PLAYER_RUN_CADENCE = 1.25;
export function movementStepDuration(distance: number, isPlayer: boolean): number {
  return Math.max(isPlayer ? 0.14 : 0.22, distance / (isPlayer ? 6.5 : 3.9));
}

export function smoothStep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** A readable impact, held brace, and slow recovery rather than a symmetric twitch. */
export function hitReactionProfile(model: string, critical = false) {
  const heavy = /golem|giant|warden|dragon|brute|troll|minotaur|bog-lurker/i.test(model);
  const beast = /wolf|hound|chimera|boar|spider/i.test(model);
  return {
    duration: (heavy ? 1.02 : beast ? 0.84 : 0.94) + (critical ? 0.14 : 0),
    distance: (heavy ? 0.1 : beast ? 0.25 : 0.22) * (critical ? 1.35 : 1),
    lean: (heavy ? 0.085 : beast ? 0.14 : 0.18) * (critical ? 1.2 : 1),
  };
}
export function hitReactionWeight(progress: number) {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < 0.12) return smoothStep(progress / 0.12);
  if (progress < 0.36) return 1 - 0.08 * smoothStep((progress - 0.12) / 0.24);
  return 0.92 * (1 - smoothStep((progress - 0.36) / 0.64));
}

/** Ease only the ends of a route: interior hexes must not cause stop/start motion. */
export function movementProgress(progress: number, first: boolean, last: boolean): number {
  const t = Math.max(0, Math.min(1, progress));
  if (first && last) return smoothStep(t);
  if (first) return t * t * (2 - t);
  if (last) return t + t * t - t * t * t;
  return t;
}

/** Keep the contact direction independent of whether the attacker can physically lunge. */
export function attackMotion(from: { x: number; z: number }, to: { x: number; z: number }, lungeDistance: number) {
  const dx = to.x - from.x,
    dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const direction = length > 0.0001 ? { x: dx / length, z: dz / length } : { x: 0, z: 0 };
  return { direction, lunge: { x: direction.x * lungeDistance, z: direction.z * lungeDistance } };
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
