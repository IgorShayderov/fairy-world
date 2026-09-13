export const MONSTER_HABITATS = [
  { key: 'whisperwood', x: 760, y: 920, nearby: 'WESTMERE', monsters: ['Dire Wolf', 'Forest Troll'] },
  { key: 'crossroads', x: 1470, y: 1040, nearby: 'EVERCROSS', monsters: ['Goblin Raider', 'Stone Golem'] },
  { key: 'southern_woods', x: 1500, y: 1680, nearby: 'MOSSKEEP', monsters: ['Shadow Stalker', 'Arcane Chimera'] },
  { key: 'moonfall_heights', x: 2020, y: 570, nearby: 'MOONFALL', monsters: ['Storm Harpy', 'Void Wraith'] },
  { key: 'frostwatch_peaks', x: 2640, y: 500, nearby: 'FROSTWATCH', monsters: ['Frost Giant', 'Dragon'] },
  { key: 'eastern_badlands', x: 2630, y: 1340, nearby: 'EMBERDEEP', monsters: ['Bone Knight', 'Infernal Minotaur'] },
] as const;

export function habitatAt(position: { x: number; y: number }) {
  return MONSTER_HABITATS.reduce((nearest, habitat) =>
    Math.hypot(position.x - habitat.x, position.y - habitat.y) <
    Math.hypot(position.x - nearest.x, position.y - nearest.y)
      ? habitat
      : nearest,
  );
}

export const habitatForMonster = (monsterType: string) =>
  MONSTER_HABITATS.find((habitat) => (habitat.monsters as readonly string[]).includes(monsterType));
