type MonsterHabitat = {
  key: string;
  x: number;
  y: number;
  nearby: string;
  monsters: readonly string[];
  radius?: number;
  areas?: readonly { x: number; y: number }[];
};

export const MONSTER_HABITATS: readonly MonsterHabitat[] = [
  { key: 'whisperwood', x: 760, y: 920, nearby: 'WESTMERE', monsters: ['Dire Wolf', 'Forest Troll'] },
  { key: 'crossroads', x: 1470, y: 1040, nearby: 'EVERCROSS', monsters: ['Goblin Raider', 'Stone Golem'] },
  { key: 'southern_woods', x: 1500, y: 1680, nearby: 'MOSSKEEP', monsters: ['Shadow Stalker', 'Arcane Chimera'] },
  { key: 'moonfall_heights', x: 2020, y: 570, nearby: 'MOONFALL', monsters: ['Storm Harpy', 'Void Wraith'] },
  { key: 'frostwatch_peaks', x: 2640, y: 500, nearby: 'FROSTWATCH', monsters: ['Frost Giant', 'Dragon'] },
  { key: 'eastern_badlands', x: 2630, y: 1340, nearby: 'EMBERDEEP', monsters: ['Bone Knight', 'Infernal Minotaur'] },
  {
    key: 'lake_shores',
    x: 360,
    y: 1120,
    nearby: 'WESTMERE',
    monsters: ['Lake Serpent', 'Drowned Siren'],
    radius: 190,
    areas: [
      { x: 360, y: 1120 },
      { x: 2320, y: 1180 },
      { x: 1040, y: 1810 },
    ],
  },
  {
    key: 'mirelands',
    x: 420,
    y: 1510,
    nearby: 'LARKHAVEN',
    monsters: ['Bog Lurker', 'Mire Hag'],
    radius: 220,
    areas: [
      { x: 420, y: 1510 },
      { x: 2900, y: 1450 },
      { x: 1250, y: 1900 },
    ],
  },
];

export const EXCLUSIVE_HABITAT_MONSTERS = new Set(
  MONSTER_HABITATS.filter((habitat) => habitat.areas).flatMap((habitat) => habitat.monsters),
);

export function habitatAt(position: { x: number; y: number }) {
  const specialHabitat = MONSTER_HABITATS.find(
    (habitat) =>
      habitat.areas?.some((area) => Math.hypot(position.x - area.x, position.y - area.y) <= (habitat.radius ?? 0)) ??
      false,
  );
  if (specialHabitat) return specialHabitat;

  const regionalHabitats = MONSTER_HABITATS.filter((habitat) => !habitat.areas);
  return regionalHabitats.reduce((nearest, habitat) =>
    Math.hypot(position.x - habitat.x, position.y - habitat.y) <
    Math.hypot(position.x - nearest.x, position.y - nearest.y)
      ? habitat
      : nearest,
  );
}

export const habitatForMonster = (monsterType: string) =>
  MONSTER_HABITATS.find((habitat) => habitat.monsters.includes(monsterType));
