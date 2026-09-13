import type { EquipmentType, ItemModifier, ItemRarity } from '@/modules/Inventory/types';

export type { InventoryEntry } from '@/modules/Inventory/types';

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  level: number;
  requiredPlayerLevel?: number;
  icon: string;
  quantity: number;
  rarity: ItemRarity;
  equipmentType: EquipmentType[];
  attributes: ItemModifier[];
  properties: ItemModifier[];
}

export interface ShopData {
  id: number;
  name: string;
  gold: number;
  refreshCost: number;
  nextRestockAt: string;
  items: ShopItem[];
}
