import type { Army, Castle } from './api';

export function remainingTime(until: string | null, now: number) {
  if (!until) return '';
  const seconds = Math.max(0, Math.ceil((Date.parse(until) - now) / 1000));
  if (!seconds) return 'Finishing…';
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${seconds % 60}s`;
}
export function selectedPower(army: Army, forge: number) {
  return Math.floor((army.sentinels * 10 + army.rangers * 16 + army.arcanists * 24) * (1 + forge * 0.1));
}
export function usedCapacity(castle: Castle) {
  return (
    castle.sentinels +
    castle.rangers +
    castle.arcanists +
    castle.trainingCount +
    castle.raidSentinels +
    castle.raidRangers +
    castle.raidArcanists
  );
}
