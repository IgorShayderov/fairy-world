export interface InventoryItem {
  name: string;
  icon: string;
  rarity?: string;
}

export interface EquipmentSlot {
  id: string;
  label: string;
  item: InventoryItem | null;
  equipped: boolean;
}
