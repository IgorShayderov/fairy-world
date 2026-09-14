import { createHash } from 'node:crypto';
import { MONSTER_HABITATS } from '../monsters/monster-habitats';
import { townQuestCount } from '../locations/towns';

// A daily, town-specific random seed keeps offers stable across reloads and servers.
export function generateTownOffers(town: { shopId: number; x: number; y: number }, now: Date, seed = '') {
  const day = now.toISOString().slice(0, 10);
  const expiresAt = new Date(`${day}T00:00:00Z`);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
  let roll = 0;
  const random = () =>
    createHash('sha256').update(`quest-board-v2:${seed}:${town.shopId}:${day}:${roll++}`).digest().readUInt32BE(0) /
    0x100000000;
  const pool = MONSTER_HABITATS.flatMap((habitat) =>
    (habitat.monsters as readonly string[]).map((monsterType) => ({ habitat, monsterType })),
  );
  return Array.from({ length: townQuestCount(town.shopId) }, (_, slot) => {
    // Favor nearby regions, while still offering expeditions farther away.
    const weights = pool.map(({ habitat }) => 1 / (250 + Math.hypot(town.x - habitat.x, town.y - habitat.y)));
    let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let index = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      remaining -= weights[i];
      if (remaining <= 0) {
        index = i;
        break;
      }
    }
    const [selected] = pool.splice(index, 1);
    const target = 8 + Math.floor(random() * 13);
    return {
      code: `town_${town.shopId}_${seed || day}_${slot}`,
      townId: town.shopId,
      regionKey: selected.habitat.key,
      monsterType: selected.monsterType,
      target,
      rewardGold: target * 10,
      rewardExperience: target * 20,
      expiresAt,
    };
  });
}
