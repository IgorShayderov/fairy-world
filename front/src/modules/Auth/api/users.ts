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
  inventory: InventoryEntry[];
  equippedItems: InventoryEntry[];
  attributes: EffectiveModifier[];
  properties: EffectiveModifier[];
};

export const usersApi = {
  async getMe(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>(routes.api.users.mePath());

    return data;
  },
  async equipItem(inventoryItemId: number, slot: EquipmentSlotId): Promise<void> {
    await api.put(routes.api.users.equipmentPath(), { inventoryItemId, slot });
  },
  async unequipItem(slot: EquipmentSlotId): Promise<void> {
    await api.delete(routes.api.users.equipmentSlotPath(slot));
  },
};
