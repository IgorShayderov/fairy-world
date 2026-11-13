export const CASTLE_MIN_LEVEL = 25;
export const FOUNDATION_GOLD = 10000;
export const MAX_BUILDING_LEVEL = 10;
export const BUILDINGS = {
  gates: {
    name: 'Dawnsteel Gates',
    description: 'Fortified gates add 100 defense per level.',
    wood: 160,
    stone: 200,
    seconds: 240,
  },
  arrowTower1: {
    name: 'West Arrow Tower',
    description: 'Adds 100 defense per level.',
    wood: 120,
    stone: 160,
    seconds: 180,
  },
  arrowTower2: {
    name: 'East Arrow Tower',
    description: 'Adds 100 defense per level.',
    wood: 120,
    stone: 160,
    seconds: 180,
  },
  mageTower1: {
    name: 'North Mage Tower',
    description: 'Adds 150 defense per level. Requires Crownkeep level 9.',
    wood: 240,
    stone: 320,
    seconds: 360,
  },
  mageTower2: {
    name: 'South Mage Tower',
    description: 'Adds 150 defense per level. Requires Crownkeep level 9.',
    wood: 240,
    stone: 320,
    seconds: 360,
  },
  gemMine: {
    name: 'Starlight Gem Mine',
    description: 'Timed expeditions uncover equipment gems. Requires Crownkeep level 5.',
    wood: 180,
    stone: 180,
    seconds: 300,
  },
  keep: {
    name: 'Crownkeep',
    description: 'The heart of your estate. Unlocks higher building levels and expands storage.',
    wood: 160,
    stone: 140,
    seconds: 300,
  },
  lumberMill: {
    name: 'Timberwright Lodge',
    description: 'Produces wood, even while you are away.',
    wood: 60,
    stone: 30,
    seconds: 60,
  },
  quarry: {
    name: 'Moonstone Quarry',
    description: 'Extracts stone for construction, even while you are away.',
    wood: 80,
    stone: 40,
    seconds: 90,
  },
  storehouse: {
    name: 'Vaulted Storehouse',
    description: 'Increases the amount of wood and stone your estate can hold.',
    wood: 100,
    stone: 80,
    seconds: 120,
  },
  barracks: {
    name: 'Oathguard Barracks',
    description: 'Trains your army. Rangers unlock at level 2; arcanists at level 3.',
    wood: 120,
    stone: 100,
    seconds: 180,
  },
  forge: {
    name: 'Starfire Forge',
    description: 'Adds 10% strength to every unit per level.',
    wood: 140,
    stone: 120,
    seconds: 180,
  },
} as const;
export type Building = keyof typeof BUILDINGS;
export const UNITS = {
  sentinels: {
    name: 'Oathguard',
    description: 'Shield-bearing infantry.',
    wood: 15,
    stone: 10,
    seconds: 45,
    power: 10,
    barracks: 1,
  },
  rangers: {
    name: 'Thorn Rangers',
    description: 'Longbow scouts with stronger ranged support.',
    wood: 25,
    stone: 10,
    seconds: 60,
    power: 16,
    barracks: 2,
  },
  arcanists: {
    name: 'Dawn Arcanists',
    description: 'Battle mages wielding concentrated starlight.',
    wood: 20,
    stone: 30,
    seconds: 90,
    power: 24,
    barracks: 3,
  },
} as const;
export type Unit = keyof typeof UNITS;
export type Levels = Record<Building, number>;
export type Army = Record<Unit, number>;
export const buildingKeys = Object.keys(BUILDINGS) as Building[];
export const unitKeys = Object.keys(UNITS) as Unit[];
export const RAID_COOLDOWN_MS = 30 * 60 * 1000;
export const RAID_SECONDS = 180;
export const NEW_CASTLE_PROTECTION_MS = 24 * 60 * 60 * 1000;
export const DEFEAT_PROTECTION_MS = 2 * 60 * 60 * 1000;
export const MAX_KEEP_DIFFERENCE = 2;
export const defensePower = (castle: Army & { keep: number; forge: number } & Partial<Levels>) =>
  castle.keep * 50 +
  armyPower(castle, castle.forge) +
  (castle.gates ?? 0) * 100 +
  ((castle.arrowTower1 ?? 0) + (castle.arrowTower2 ?? 0)) * 100 +
  ((castle.mageTower1 ?? 0) + (castle.mageTower2 ?? 0)) * 150;
export const requiredKeep = (building: Building) =>
  building === 'gemMine' ? 5 : building.startsWith('mageTower') ? 9 : 1;
export const miningCost = (level: number) => ({ wood: level * 100, stone: level * 80, seconds: 1800 + level * 120 });
export const raidLoot = (defender: { wood: number; stone: number }, free: { wood: number; stone: number }) => ({
  wood: Math.max(0, Math.min(Math.floor(defender.wood * 0.1), Math.floor(free.wood))),
  stone: Math.max(0, Math.min(Math.floor(defender.stone * 0.1), Math.floor(free.stone))),
});
export function raidResult(power: number, defense: number, army: Army) {
  const victory = power >= defense;
  const lossFraction = victory ? Math.min(0.45, Math.max(0.1, (defense / Math.max(1, power)) * 0.4)) : 0.65;
  const losses = Object.fromEntries(
    unitKeys.map((key) => [key, Math.min(army[key], Math.ceil(army[key] * lossFraction))]),
  ) as Army;
  return { victory, losses };
}
export const isBuilding = (value: string): value is Building => Object.hasOwn(BUILDINGS, value);
export const isUnit = (value: string): value is Unit => Object.hasOwn(UNITS, value);
export const storageCapacity = (levels: Pick<Levels, 'keep' | 'storehouse'>) =>
  1000 * levels.keep ** 2 + 2000 * levels.storehouse ** 2;
export const armyCapacity = (barracks: number) => barracks * 20;
export const armySize = (army: Army) => army.sentinels + army.rangers + army.arcanists;
export const production = (levels: Pick<Levels, 'lumberMill' | 'quarry'>) => ({
  wood: levels.lumberMill * 120,
  stone: levels.quarry * 90,
});
export const armyPower = (army: Army, forge: number) =>
  Math.floor(unitKeys.reduce((sum, key) => sum + army[key] * UNITS[key].power, 0) * (1 + forge * 0.1));
export function upgradeCost(building: Building, nextLevel: number): { wood: number; stone: number; seconds: number } {
  if (building.startsWith('mageTower')) {
    const arrow = upgradeCost('arrowTower1', nextLevel);
    return { wood: arrow.wood * 2, stone: arrow.stone * 2, seconds: arrow.seconds * 2 };
  }
  const definition = BUILDINGS[building];
  const factor = 1.65 ** (nextLevel - 1);
  return {
    wood: Math.ceil(definition.wood * factor),
    stone: Math.ceil(definition.stone * factor),
    seconds: Math.ceil(definition.seconds * nextLevel ** 1.5),
  };
}

/** No browser clocks or background jobs are needed for offline production. */
export function accrue<
  T extends Pick<Levels, 'keep' | 'storehouse' | 'lumberMill' | 'quarry'> & {
    wood: number;
    stone: number;
    producedAt: Date;
  },
>(castle: T, until: Date) {
  const hours = Math.max(0, until.getTime() - castle.producedAt.getTime()) / 3_600_000;
  const rates = production(castle);
  const cap = storageCapacity(castle);
  castle.wood = Math.min(cap, castle.wood + rates.wood * hours);
  castle.stone = Math.min(cap, castle.stone + rates.stone * hours);
  if (until > castle.producedAt) castle.producedAt = until;
}
