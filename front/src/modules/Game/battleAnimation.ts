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

export function attackTiming(clipName: string, power: boolean) {
  const heavy = /heavy_weapon|Weapon|Chop/i.test(clipName);
  return { duration: power ? 1.35 : heavy ? 1.12 : 0.9, impact: heavy ? 0.52 : 0.45 };
}
