import { createHash } from 'node:crypto';
import { MONSTER_HABITATS } from '../monsters/monster-habitats';
import { TOWNS, townQuestCount } from '../locations/towns';

export const MAX_QUEST_LEVEL_MODIFIER = 0.4;
export const MIN_QUEST_LEVEL_MODIFIER = 0.25;

// A daily, town-specific random seed keeps offers stable across reloads and servers.
export function generateTownOffers(
  town: { shopId: number; x: number; y: number },
  now: Date,
  seed = '',
  playerLevel = 1,
) {
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
    const levelModifier =
      playerLevel > 1
        ? Number(
            (MIN_QUEST_LEVEL_MODIFIER + random() * (MAX_QUEST_LEVEL_MODIFIER - MIN_QUEST_LEVEL_MODIFIER)).toFixed(2),
          )
        : 0;
    const levelMultiplier = 1 + (Math.max(1, playerLevel) - 1) * levelModifier;

    if (slot === 0) {
      const destinations = TOWNS.filter((entry) => entry.shopId !== town.shopId);
      const destination = destinations[Math.floor(random() * destinations.length)];
      return {
        code: `town_${town.shopId}_${seed || day}_${slot}`,
        townId: town.shopId,
        destinationTownId: destination.shopId,
        regionKey: null,
        monsterType: 'DELIVERY',
        target: 1,
        rewardGold: Math.round(50 * levelMultiplier),
        rewardExperience: Math.round(100 * levelMultiplier),
        expiresAt,
      };
    }
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
      rewardGold: Math.round(target * 10 * levelMultiplier),
      rewardExperience: Math.round(target * 20 * levelMultiplier),
      expiresAt,
    };
  });
}
