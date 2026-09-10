export type ItemRarity = 'QUEST' | 'COMMON' | 'MAGIC' | 'RARE' | 'UNIQUE';
export type EquipmentType =
  | 'WEAPON'
  | 'SHIELD'
  | 'BODY'
  | 'HELMET'
  | 'BOOTS'
  | 'GLOVES'
  | 'LEGS'
  | 'RING'
  | 'AMULET'
  | 'SCROLL'
  | 'POTION'
  | 'UNKNOWN';

export interface InventoryItemType {
  nameKey: string;
  name?: string;
  icon: string;
  rarity?: string;
  equipmentType?: EquipmentType[];
  equipmentTypes?: EquipmentType[];
}

export interface EquipmentSlot {
  id: string;
  item: InventoryItemType | null;
  gridArea?: string;
}

export interface StatItem {
  key: string;
  value: number;
}

export interface StatInfoItem {
  key: string;
  value: number;
}
