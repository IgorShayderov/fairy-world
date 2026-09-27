export const CLAN_BUILDING_MAX_LEVEL = 50;
export const CLAN_BUILDING_BONUS_PER_LEVEL = 2;
export type ClanBuilding = 'treasure' | 'armory';

export const clanBuildingUpgradeCost = (level: number) => Math.round(2_500 * Math.pow(Math.max(0, level) + 1, 1.7));

export const clanBuildingBonus = (level: number) =>
  Math.max(0, Math.min(CLAN_BUILDING_MAX_LEVEL, level)) * CLAN_BUILDING_BONUS_PER_LEVEL;
