import { api } from '@/shared/api';

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  icon: string;
  quantity: number;
}

export interface InventoryItem {
  id: number;
  item: ShopItem;
  quantity: number;
}

export const getShopItems = async (): Promise<ShopItem[]> => {
  const response = await api('/shop/items');
  return response.json();
};

export const buyItem = async (itemId: number, quantity = 1): Promise<{ success: boolean; totalCost: number }> => {
  const response = await api('/shop/buy', {
    method: 'POST',
    body: JSON.stringify({ itemId, quantity }),
  });
  return response.json();
};

export const sellItem = async (name: string, quantity = 1): Promise<{ success: boolean; sellValue: number }> => {
  const response = await api('/shop/sell', {
    method: 'POST',
    body: JSON.stringify({ name, quantity }),
  });
  return response.json();
};

export const getInventory = async (): Promise<InventoryItem[]> => {
  const response = await api('/shop/inventory');
  return response.json();
};
