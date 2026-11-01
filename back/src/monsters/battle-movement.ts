/** Tactical movement is measured in traversable hexes per turn, not attacks. */
export function playerMovement(agility: number): number {
  return 3 + Math.min(3, Math.floor(Math.max(0, Number.isFinite(agility) ? agility : 0) / 10));
}

export const MONSTER_MOVEMENT: Readonly<Record<string, number>> = {
  'Goblin Hexer': 4,
  'Ash Invoker': 3,
  'Frost Revenant': 3,
  'Goblin Raider': 3,
  'Dire Wolf': 5,
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
  // Dungeon roles use their own archetypes, not the randomly generated stat donor.
  'Flamebound Stalker': 5,
  'Cinder Stone Brute': 1,
  'Ember Wraith': 4,
  'Warden of the First Flame': 3,
  'Hollowfang Stalker': 5,
  'Ossuary Colossus': 2,
  'Veilbound Hexer': 3,
  'The Hollow King': 3,
  'Rimeclaw Hunter': 5,
  'Glacier Troll': 2,
  'Frost Wraith': 4,
  'Icebound Sovereign': 2,
  'Gravewing Stalker': 5,
  'Bonebound Knight': 3,
  'Plague Seer': 3,
  'The Raven Lich': 4,
};

export function monsterMovement(type: string): number {
  return Math.max(1, MONSTER_MOVEMENT[type] ?? 2);
}

/** Compensate natural slowness; status effects must never increase attack power. */
export function slowMonsterDamage(damage: number, type: string): number {
  const movement = monsterMovement(type);
  return Math.ceil(damage * (movement === 1 ? 1.5 : movement === 2 ? 1.25 : 1));
}
