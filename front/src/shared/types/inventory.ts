export interface InventoryItem {
  name: string;
  icon: string;
  rarity?: string;
}

export type ItemRarity = 'common' | 'rare' | 'legendary';

export interface InventoryItemType {
  nameKey: string;
  icon: string;
  rarityKey?: string;
}

export interface EquipmentSlot {
  id: string;
  labelKey: string;
  item: InventoryItemType | null;
  equipped: boolean;
  gridArea?: string;
}

export interface StatItem {
  key: string;
  labelKey: string;
  value: number;
}

export interface StatInfoItem {
  key: string;
  labelKey: string;
  value: number;
}
