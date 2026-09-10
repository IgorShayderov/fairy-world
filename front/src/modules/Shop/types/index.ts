import type { EquipmentType, ItemRarity } from '@/modules/Inventory/types';

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  icon: string;
  quantity: number;
  rarity: ItemRarity;
  equipmentType: EquipmentType[];
}

export interface InventoryEntry {
  id: number;
  item: Omit<ShopItem, 'quantity'>;
  quantity: number;
}

export interface ShopData {
  id: number;
  name: string;
  gold: number;
  items: ShopItem[];
}
