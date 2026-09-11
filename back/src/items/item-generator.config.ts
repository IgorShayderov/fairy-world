import { AttributeType, EquipmentType, ItemRarity, StatType } from '../../generated/client';

export type Modifier =
  | {
      kind: 'stat';
      name: string;
      stat: StatType;
      min: number;
      max: number;
      equipmentTypes: EquipmentType[];
    }
  | {
      kind: 'attribute';
      name: string;
      attribute: AttributeType;
      min: number;
      max: number;
      equipmentTypes: EquipmentType[];
    };

export interface BaseItem {
  name: string;
  equipmentType: EquipmentType;
  basePrice: number;
  icon: string;
  baseStats?: Partial<Record<StatType, number>>;
}

export const BASE_ITEMS: BaseItem[] = [
  {
    name: 'Sword',
    equipmentType: EquipmentType.WEAPON,
    basePrice: 50,
    icon: 'icon_sword.png',
    baseStats: {
      [StatType.DAMAGE]: 3,
    },
  },
  {
    name: 'Shield',
    equipmentType: EquipmentType.SHIELD,
    basePrice: 50,
    icon: 'icon_shield.png',
    baseStats: {
      [StatType.DEFENSE]: 3,
    },
  },
  {
    name: 'Armor',
    equipmentType: EquipmentType.BODY,
    basePrice: 100,
    icon: 'icon_armor.png',
    baseStats: {
      [StatType.DEFENSE]: 5,
    },
  },
  {
    name: 'Helmet',
    equipmentType: EquipmentType.HELMET,
    basePrice: 75,
    icon: 'icon_helmet.png',
    baseStats: {
      [StatType.DEFENSE]: 2,
    },
  },
  {
    name: 'Boots',
    equipmentType: EquipmentType.BOOTS,
    basePrice: 60,
    icon: 'icon_boots.png',
  },
  {
    name: 'Ring',
    equipmentType: EquipmentType.RING,
    basePrice: 100,
    icon: 'icon_ring.png',
  },
  {
    name: 'Amulet',
    equipmentType: EquipmentType.AMULET,
    basePrice: 150,
    icon: 'icon_amulet.png',
  },
];

export const PREFIXES: Modifier[] = [
  {
    kind: 'stat',
    name: 'Deadly',
    stat: StatType.DAMAGE,
    min: 1,
    max: 5,
    equipmentTypes: [EquipmentType.WEAPON],
  },
  {
    kind: 'stat',
    name: 'Sturdy',
    stat: StatType.DEFENSE,
    min: 1,
    max: 5,
    equipmentTypes: [EquipmentType.SHIELD, EquipmentType.BODY, EquipmentType.HELMET, EquipmentType.BOOTS],
  },
  {
    kind: 'stat',
    name: 'Lucky',
    stat: StatType.CRIT,
    min: 1,
    max: 5,
    equipmentTypes: [EquipmentType.WEAPON, EquipmentType.RING, EquipmentType.AMULET],
  },
  {
    kind: 'stat',
    name: 'Savage',
    stat: StatType.CRIT_DAMAGE,
    min: 3,
    max: 15,
    equipmentTypes: [EquipmentType.WEAPON],
  },
];

export const SUFFIXES: Modifier[] = [
  {
    kind: 'attribute',
    name: 'of Strength',
    attribute: AttributeType.STRENGTH,
    min: 1,
    max: 5,
    equipmentTypes: Object.values(EquipmentType),
  },
  {
    kind: 'attribute',
    name: 'of Agility',
    attribute: AttributeType.AGILITY,
    min: 1,
    max: 5,
    equipmentTypes: Object.values(EquipmentType),
  },
  {
    kind: 'attribute',
    name: 'of Wisdom',
    attribute: AttributeType.WISDOM,
    min: 1,
    max: 5,
    equipmentTypes: Object.values(EquipmentType),
  },
  {
    kind: 'attribute',
    name: 'of Endurance',
    attribute: AttributeType.ENDURANCE,
    min: 1,
    max: 5,
    equipmentTypes: Object.values(EquipmentType),
  },
];

export const RARITY_WEIGHTS: Array<{
  rarity: ItemRarity;
  weight: number;
}> = [
  { rarity: ItemRarity.COMMON, weight: 60 },
  { rarity: ItemRarity.MAGIC, weight: 30 },
  { rarity: ItemRarity.RARE, weight: 10 },
];
