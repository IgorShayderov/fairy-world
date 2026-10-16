import type { InventoryEntry, ItemRarity } from '@/modules/Inventory/types';

import { isTwoHanded } from '@/modules/Inventory/utils/equipment';

export type BattleWeaponKind = 'SWORD' | 'AXE' | 'DAGGER' | 'BOW' | 'CROSSBOW';
export type BattleHandMode = 'UNARMED' | 'SINGLE' | 'WEAPON_SHIELD' | 'DUAL' | 'TWO_HANDED' | 'BOW' | 'CROSSBOW';

export interface BattlePlayerLoadout {
  handMode: BattleHandMode;
  primaryWeapon: BattleWeaponKind;
  secondaryWeapon: BattleWeaponKind | null;
  primaryIcon: string | null;
  secondaryIcon: string | null;
  shieldIcon: string | null;
  hasHelmet: boolean;
  hasBodyArmor: boolean;
  accent: string;
}

const RARITY_ACCENTS: Record<ItemRarity, string> = {
  QUEST: '#86d6ff',
  COMMON: '#c7d2d7',
  MAGIC: '#63a8ff',
  RARE: '#a785ff',
  UNIQUE: '#f2c75c',
};

const weaponKind = (name: string): BattleWeaponKind => {
  const normalized = name.toLowerCase();
  if (/\bcrossbow\b/.test(normalized)) return 'CROSSBOW';
  if (/\bbow\b/.test(normalized)) return 'BOW';
  if (normalized.includes('axe')) return 'AXE';
  if (normalized.includes('dagger')) return 'DAGGER';
  return 'SWORD';
};

const itemIconPath = (entry: InventoryEntry | undefined) => {
  if (!entry?.item.icon) return null;
  return entry.item.icon.startsWith('/') ? entry.item.icon : `/icons/items/${entry.item.icon}`;
};

export const getBattlePlayerLoadout = (inventory: readonly InventoryEntry[] | undefined): BattlePlayerLoadout => {
  const equipped = (inventory ?? []).filter((entry) => entry.isEquiped || entry.slot !== null);
  const hands = equipped
    .filter((entry) => entry.slot === 'left-hand' || entry.slot === 'right-hand')
    .sort((left, right) => (left.slot === 'left-hand' ? -1 : right.slot === 'left-hand' ? 1 : 0));
  const weapons = hands.filter((entry) => entry.item.equipmentType.includes('WEAPON'));
  const shield = hands.find((entry) => entry.item.equipmentType.includes('SHIELD'));
  const primary = weapons[0];
  const twoHanded = primary && weapons.some((entry) => isTwoHanded(entry.item));

  let handMode: BattleHandMode = 'UNARMED';
  const kind = weaponKind(primary?.item.name ?? '');
  if (primary && (kind === 'BOW' || kind === 'CROSSBOW')) handMode = kind;
  else if (twoHanded) handMode = 'TWO_HANDED';
  else if (weapons.length >= 2) handMode = 'DUAL';
  else if (primary && shield) handMode = 'WEAPON_SHIELD';
  else if (primary) handMode = 'SINGLE';

  const visibleEquipment = equipped.filter((entry) =>
    entry.item.equipmentType.some((type) => ['WEAPON', 'SHIELD', 'BODY', 'HELMET'].includes(type))
  );
  const highestRarity = visibleEquipment.reduce<ItemRarity>((best, entry) => {
    const order: ItemRarity[] = ['COMMON', 'MAGIC', 'RARE', 'UNIQUE', 'QUEST'];
    return order.indexOf(entry.item.rarity) > order.indexOf(best) ? entry.item.rarity : best;
  }, 'COMMON');

  return {
    handMode,
    primaryWeapon: weaponKind(primary?.item.name ?? 'Sword'),
    secondaryWeapon: weapons[1] ? weaponKind(weapons[1].item.name) : null,
    primaryIcon: itemIconPath(primary),
    secondaryIcon: itemIconPath(weapons[1]),
    shieldIcon: itemIconPath(shield),
    hasHelmet: equipped.some((entry) => entry.slot === 'head' && entry.item.equipmentType.includes('HELMET')),
    hasBodyArmor: equipped.some((entry) => entry.slot === 'body' && entry.item.equipmentType.includes('BODY')),
    accent: RARITY_ACCENTS[highestRarity],
  };
};
