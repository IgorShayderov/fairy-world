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

export type EquipmentSlotId =
  'head' | 'body' | 'left-hand' | 'right-hand' | 'hands' | 'legs' | 'feet' | 'accessory' | 'scroll' | 'potion';

export interface ItemModifier {
  name: string;
  description: string | null;
  value: number;
}

export interface EffectiveModifier extends ItemModifier {
  baseValue: number;
  attributeBonus?: number;
  equipmentBonus: number;
}

export interface InventoryItemType {
  inventoryItemId?: number;
  id?: number;
  nameKey: string;
  name?: string;
  tooltipName?: string;
  icon: string;
  description?: string;
  price?: number;
  rarity?: string | undefined;
  rarityKey?: string;
  equipmentType?: EquipmentType[];
  equipmentTypes?: EquipmentType[];
  quantity?: number;
  attributes?: ItemModifier[];
  properties?: ItemModifier[];
  slot?: EquipmentSlotId | null;
}

export interface InventoryEntry {
  id: number;
  item: {
    id: number;
    name: string;
    description: string;
    price: number;
    icon: string;
    rarity: ItemRarity;
    equipmentType: EquipmentType[];
    attributes: ItemModifier[];
    properties: ItemModifier[];
  };
  quantity: number;
  slot: EquipmentSlotId | null;
  isEquiped: boolean;
}

export interface EquipmentSlot {
  id: EquipmentSlotId;
  labelKey: string;
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
