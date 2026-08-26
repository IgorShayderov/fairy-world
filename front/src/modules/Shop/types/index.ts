export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  icon: string;
  quantity: number;
}

export interface InventoryEntry {
  id: number;
  item: ShopItem;
  quantity: number;
}
