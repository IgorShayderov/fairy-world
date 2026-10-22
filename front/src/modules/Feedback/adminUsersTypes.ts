export type AttributeName = 'STRENGTH' | 'AGILITY' | 'ENDURANCE' | 'WISDOM' | 'CHARISMA';
export interface AdminItem {
  id: number;
  name: string;
  level: number;
  requiredPlayerLevel: number;
  rarity: string;
  equipmentType: string[];
  attributes: Array<{ name: string; value: number }>;
  properties: Array<{ name: string; value: number }>;
}
export interface AdminInventoryEntry {
  id: number;
  itemId: number;
  quantity: number;
  isEquiped: boolean;
  slot: string | null;
  upgradeType: string | null;
  upgradeValue: number | null;
  item: AdminItem;
}
export interface AdminProfileValues {
  level: number;
  experience: number;
  gold: number;
  gems: number;
  coinsOfHonour: number;
  freeAttributes: number;
}
export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
  gameProfile: { level: number; gold: number; gems: number } | null;
}
export interface AdminUserDetail extends Omit<AdminUserSummary, 'gameProfile'> {
  stateToken: string;
  locked: boolean;
  createdAt: string;
  experienceToNextLevel: number | null;
  skillPoints: { total: number; spent: number; available: number } | null;
  gameProfile:
    | (AdminProfileValues & {
        id: number;
        inventory: AdminInventoryEntry[];
        profileAttributes: Array<{ value: number; attribute: { name: AttributeName } }>;
        killedMonsters: number;
        dungeonsCleared: number;
        premiumAccount: { active: boolean; expiresAt: string } | null;
      })
    | null;
  audits: Array<{ id: string; action: string; reason: string; createdAt: string; admin: { id: number; name: string } }>;
}
export interface AdminPageResult<T> {
  entries: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AdminChange {
  expectedState: string;
  reason: string;
}
export interface AdminProfileEdit extends AdminProfileValues, AdminChange {
  name: string;
  email: string;
  attributes: Array<{ name: AttributeName; value: number }>;
}
export interface AdminUserCreate {
  name: string;
  email: string;
  password: string;
  reason: string;
}
export type AdminInventoryEdit = AdminChange & { action: 'quantity' | 'remove' | 'unequip'; quantity?: number };
