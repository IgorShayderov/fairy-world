import type { ShopItem, InventoryEntry } from '@/modules/Shop/types';

import routes from '@/routes';
import { api } from '@/shared/api';

export const getShopItems = async (): Promise<ShopItem[]> => {
  const { data } = await api.get<ShopItem[]>(routes.api.shop.itemsPath());
  return data;
};

export const buyItem = async (itemId: number, quantity = 1): Promise<{ success: boolean; totalCost: number }> => {
  const { data } = await api.post<{ success: boolean; totalCost: number }>(routes.api.shop.buyPath(), {
    itemId,
    quantity,
  });
  return data;
};

export const sellItem = async (name: string, quantity = 1): Promise<{ success: boolean; sellValue: number }> => {
  const { data } = await api.post<{ success: boolean; sellValue: number }>(routes.api.shop.sellPath(), {
    name,
    quantity,
  });
  return data;
};

export const getInventory = async (): Promise<InventoryEntry[]> => {
  const { data } = await api.get<InventoryEntry[]>(routes.api.shop.inventoryPath());
  return data;
};

export const equipItem = async (inventoryItemId: number, equipped: boolean): Promise<InventoryEntry> => {
  const { data } = await api.post<InventoryEntry>(routes.api.shop.equipPath(), {
    inventoryItemId,
    equipped,
  });
  return data;
};
