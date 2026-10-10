/** Tactical movement is measured in traversable hexes per turn, not attacks. */
export function playerMovement(agility: number): number {
  return 3 + Math.min(3, Math.floor(Math.max(0, Number.isFinite(agility) ? agility : 0) / 10));
}

export const MONSTER_MOVEMENT: Readonly<Record<string, number>> = {
  'Goblin Raider': 3,
  'Dire Wolf': 4,
  'Bone Knight': 2,
  'Forest Troll': 2,
  'Shadow Stalker': 4,
  'Storm Harpy': 5,
  'Stone Golem': 1,
  'Void Wraith': 3,
  'Infernal Minotaur': 3,
  'Arcane Chimera': 4,
  'Frost Giant': 2,
  Dragon: 4,
  'Lake Serpent': 3,
  'Drowned Siren': 2,
  'Bog Lurker': 1,
  'Mire Hag': 2,
};

export function monsterMovement(type: string): number {
  return MONSTER_MOVEMENT[type] ?? 2;
}
