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
  item: ShopItem;
  quantity: number;
}
