import type { CraftInventoryItem, EffectiveModifier, EquipmentSlotId, InventoryEntry } from '@/modules/Inventory/types';

import routes from '@/routes';
import { api } from '@shared/api';

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  gold: number;
  gems: number;
  killedMonsters?: number;
  accomplishedQuests?: number;
  sanctuaryCooldowns?: Array<{ sanctuaryId: number; nextBlessingAt: string }>;
  experience: number;
  experienceToNextLevel?: number | null;
  maxLevel?: number;
  devGemPurchasesEnabled?: boolean;
  currentShopId?: number | null;
  dungeonCooldowns?: Array<{ dungeon: string; nextEntryAt: string }>;
  level: number;
  freeAttributes: number;
  mapPosition: MapPosition;
  activeBuffs: ActiveBuff[];
  inventory: InventoryEntry[];
  equippedItems: InventoryEntry[];
  attributes: EffectiveModifier[];
  properties: EffectiveModifier[];
  craftInventory: CraftInventoryItem[];
  rewardBonuses?: { goldPercent: number; experiencePercent: number };
};

export type MapPosition = {
  x: number;
  y: number;
};

export type ActiveBuff = {
  type: 'DAMAGE' | 'DEFENSE' | 'EXPERIENCE';
  value: number;
  expiresAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  name: string;
  level: number;
  killedMonsters: number;
  questsCompleted: number;
};

export const usersApi = {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data } = await api.get<LeaderboardEntry[]>(routes.api.users.leaderboardPath());
    return data;
  },
  async claimDevGems(): Promise<void> {
    await api.post(routes.api.users.devGemsPath());
  },
  async getMe(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>(routes.api.users.mePath());

    return data;
  },
  async allocateAttribute(attribute: string, amount = 1): Promise<void> {
    await api.post(routes.api.users.attributesPath(), { attribute, amount });
  },
  async consumeInventoryItem(inventoryItemId: number): Promise<void> {
    await api.post(routes.api.users.consumeInventoryItemPath(inventoryItemId));
  },
  async dropInventoryItem(inventoryItemId: number): Promise<void> {
    await api.delete(routes.api.users.dropInventoryItemPath(inventoryItemId));
  },
  async replaceInventoryItem(replaceInventoryItemId: number, newItemId: number): Promise<{ inventoryItemId: number }> {
    const { data } = await api.post<{ inventoryItemId: number }>(routes.api.users.replaceInventoryItemPath(), {
      replaceInventoryItemId,
      newItemId,
    });
    return data;
  },
  async updateMapPosition(position: MapPosition): Promise<MapPosition> {
    const { data } = await api.put<MapPosition>(routes.api.users.mapPositionPath(), position);
    return data;
  },
  async equipItem(inventoryItemId: number, slot: EquipmentSlotId): Promise<void> {
    await api.put(routes.api.users.equipmentPath(), { inventoryItemId, slot });
  },
  async unequipItem(slot: EquipmentSlotId): Promise<void> {
    await api.delete(routes.api.users.equipmentSlotPath(slot));
  },
};
