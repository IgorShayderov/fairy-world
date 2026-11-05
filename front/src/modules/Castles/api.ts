import routes from '@/routes';
import { api } from '@/shared/api';

export type BuildingKey = 'keep' | 'lumberMill' | 'quarry' | 'storehouse' | 'barracks' | 'forge';
export type UnitKey = 'sentinels' | 'rangers' | 'arcanists';
export type Army = Record<UnitKey, number>;
export type Cost = { wood: number; stone: number; seconds: number };
export type CastleBuilding = {
  key: BuildingKey;
  name: string;
  description: string;
  level: number;
  nextCost: Cost | null;
  unlocked: boolean;
};
export type CastleUnit = Cost & {
  key: UnitKey;
  name: string;
  description: string;
  count: number;
  power: number;
  barracks: number;
};
export type RaidTarget = {
  id: string;
  name: string;
  owner: string;
  keep: number;
  defense: number;
  wood: number;
  stone: number;
  seconds: number;
  rating: number;
  reason: string | null;
  protectedUntil: string | null;
};
export type CastleReport = {
  id: string;
  target: string;
  kind: 'ATTACK' | 'DEFENSE' | 'RETURN';
  victory: boolean;
  wood: number;
  stone: number;
  lostSentinels: number;
  lostRangers: number;
  lostArcanists: number;
  createdAt: string;
};
export type Castle = Army &
  Record<BuildingKey, number> & {
    id: string;
    name: string;
    x: number;
    y: number;
    city: string;
    wood: number;
    stone: number;
    capacity: number;
    production: { wood: number; stone: number };
    armyCapacity: number;
    armyPower: number;
    construction: BuildingKey | null;
    constructionEndsAt: string | null;
    training: UnitKey | null;
    trainingCount: number;
    trainingEndsAt: string | null;
    raidTarget: string | null;
    raidSentinels: number;
    raidRangers: number;
    raidArcanists: number;
    raidEndsAt: string | null;
    raidCooldownUntil: string | null;
    protectedUntil: string | null;
    defensePower: number;
    rating: number;
    victories: number;
    buildings: CastleBuilding[];
    units: CastleUnit[];
    reports: CastleReport[];
  };
export type CastleState = {
  serverTime: string;
  eligible: boolean;
  minLevel: number;
  foundationGold: number;
  gold: number;
  castle: Castle | null;
  placement: { cities: { name: string; x: number; y: number }[]; radius: number; clearance: number };
};
export type CastleSite = { valid: boolean; reason: string; city: string | null };
export type CastleRanking = {
  rank: number;
  id: string;
  name: string;
  owner: string;
  keep: number;
  rating: number;
  victories: number;
  isCurrent: boolean;
  protectedUntil: string | null;
};
export const castlesApi = {
  async get() {
    return (await api.get<CastleState>(routes.api.castles.path('me'))).data;
  },
  async site(x: number, y: number) {
    return (await api.post<CastleSite>(routes.api.castles.path('site'), { x, y })).data;
  },
  async create(name: string, x: number, y: number) {
    await api.post(routes.api.castles.path(), { name, x, y });
  },
  async upgrade(building: BuildingKey) {
    await api.post(routes.api.castles.path('upgrade'), { building });
  },
  async train(unit: UnitKey, count: number) {
    await api.post(routes.api.castles.path('train'), { unit, count });
  },
  async raid(target: string, army: Army) {
    await api.post(routes.api.castles.path('raid'), { target, ...army });
  },
  async preview(id: string) {
    return (await api.get<RaidTarget>(routes.api.castles.path(`opponents/${encodeURIComponent(id)}`))).data;
  },
  async leaderboard() {
    return (await api.get<CastleRanking[]>(routes.api.castles.path('leaderboard'))).data;
  },
};
