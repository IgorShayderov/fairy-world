import { EquipmentType, ItemRarity } from '../../generated/client';

type ShieldItem = {
  equipmentType?: EquipmentType[];
  rarity?: ItemRarity;
  level?: number;
};

export function shieldBlockChance(item: ShieldItem): number {
  if (!item.equipmentType?.includes(EquipmentType.SHIELD)) return 0;
  if (item.rarity === ItemRarity.UNIQUE && (item.level ?? 1) >= 15) return 20;
  if (item.rarity === ItemRarity.RARE && (item.level ?? 1) >= 10) return 15;
  return 10;
}
