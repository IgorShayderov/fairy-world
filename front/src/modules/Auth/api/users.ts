import type { EffectiveModifier, EquipmentSlotId, InventoryEntry } from '@/modules/Inventory/types';

import routes from '@/routes';
import { api } from '@shared/api';

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  gold: number;
  gems: number;
  experience: number;
  level: number;
  freeAttributes: number;
  mapPosition: MapPosition;
  activeBuffs: ActiveBuff[];
  inventory: InventoryEntry[];
  equippedItems: InventoryEntry[];
  attributes: EffectiveModifier[];
  properties: EffectiveModifier[];
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

export const usersApi = {
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
