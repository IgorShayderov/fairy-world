import type { ShopData } from '@/modules/Shop/types';

import routes from '@/routes';
import { api } from '@/shared/api';

export const getShop = async (shopId: number): Promise<ShopData> => {
  const { data } = await api.get<ShopData>(routes.api.shop.detailsPath(shopId));
  return data;
};

export const buyItem = async (
  shopId: number,
  itemId: number,
  quantity: number
): Promise<{ success: boolean; totalCost: number }> => {
  const { data } = await api.post<{ success: boolean; totalCost: number }>(routes.api.shop.buyPath(shopId), {
    itemId,
    quantity,
  });
  return data;
};

export const sellItem = async (
  shopId: number,
  itemId: number,
  quantity: number
): Promise<{ success: boolean; earnedGold: number; quantity: number }> => {
  const { data } = await api.post<{ success: boolean; earnedGold: number; quantity: number }>(
    routes.api.shop.sellPath(shopId),
    {
      itemId,
      quantity,
    }
  );
  return data;
};

export type SaleLine = { itemId: number; quantity: number };

export const sellItems = async (
  shopId: number,
  items: SaleLine[]
): Promise<{ success: boolean; earnedGold: number; quantity: number }> => {
  const { data } = await api.post<{ success: boolean; earnedGold: number; quantity: number }>(
    routes.api.shop.sellManyPath(shopId),
    { items }
  );
  return data;
};

export const refreshShop = async (
  shopId: number
): Promise<{ success: boolean; cost: number; nextRestockAt: string }> => {
  const { data } = await api.post<{ success: boolean; cost: number; nextRestockAt: string }>(
    routes.api.shop.refreshPath(shopId)
  );
  return data;
};
