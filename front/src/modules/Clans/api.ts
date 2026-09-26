import routes from '@/routes';
import { api } from '@/shared/api';

export type ClanRole = 'LEADER' | 'OFFICER' | 'MEMBER';

export type ClanMember = {
  profileId: number;
  name: string;
  level: number;
  role: ClanRole;
  contributedActivity: number;
  joinedAt: string;
};

export type Clan = {
  id: string;
  name: string;
  tag: string;
  description: string;
  activityPoints: number;
  activeBannerCode: string | null;
  unlockedBannerCodes: string[];
  memberCount: number;
  maxMembers: number;
  viewerRole: ClanRole;
  viewerProfileId: number;
  activityRewards: { monsterKill: number; quest: number; pvpVictory: number; dungeon: number };
  members: ClanMember[];
};

export type ClanSummary = Pick<
  Clan,
  'id' | 'name' | 'tag' | 'description' | 'activityPoints' | 'activeBannerCode' | 'memberCount'
>;

export type ClanBanner = {
  code: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  colors: readonly [string, string, string];
  unlocked: boolean;
};

export type ClanShop = {
  activityPoints: number;
  activeBannerCode: string | null;
  canManage: boolean;
  banners: ClanBanner[];
};

export const clansApi = {
  async getMine() {
    const { data } = await api.get<{ clan: Clan | null; minLevel: number; eligible: boolean }>(
      routes.api.clans.mePath()
    );
    return data;
  },
  async list() {
    const { data } = await api.get<{ canJoin: boolean; minLevel: number; maxMembers: number; clans: ClanSummary[] }>(
      routes.api.clans.listPath()
    );
    return data;
  },
  async create(payload: { name: string; tag: string; description: string }) {
    const { data } = await api.post<Clan>(routes.api.clans.createPath(), payload);
    return data;
  },
  async join(clanId: string) {
    const { data } = await api.post<Clan>(routes.api.clans.joinPath(clanId));
    return data;
  },
  async leave() {
    const { data } = await api.post<{ left: boolean; clanDisbanded: boolean }>(routes.api.clans.leavePath());
    return data;
  },
  async getShop() {
    const { data } = await api.get<ClanShop>(routes.api.clans.shopPath());
    return data;
  },
  async buyBanner(code: string) {
    const { data } = await api.post<ClanShop>(routes.api.clans.buyBannerPath(code));
    return data;
  },
  async equipBanner(code: string) {
    const { data } = await api.post<ClanShop>(routes.api.clans.equipBannerPath(code));
    return data;
  },
  async setRole(profileId: number, role: 'OFFICER' | 'MEMBER') {
    const { data } = await api.post<Clan>(routes.api.clans.memberRolePath(profileId), { role });
    return data;
  },
  async removeMember(profileId: number) {
    const { data } = await api.delete<Clan>(routes.api.clans.memberPath(profileId));
    return data;
  },
};
