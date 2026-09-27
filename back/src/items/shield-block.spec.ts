import { EquipmentType, ItemRarity } from '../../generated/client';
import { shieldBlockChance } from './shield-block';

const shield = (rarity: ItemRarity, level: number) => ({ equipmentType: [EquipmentType.SHIELD], rarity, level });

describe('shieldBlockChance', () => {
  it('gives every shield a 10% baseline block chance', () => {
    expect(shieldBlockChance(shield(ItemRarity.COMMON, 1))).toBe(10);
    expect(shieldBlockChance(shield(ItemRarity.MAGIC, 20))).toBe(10);
  });

  it('raises qualifying Rare and Unique shields to 15% and 20%', () => {
    expect(shieldBlockChance(shield(ItemRarity.RARE, 9))).toBe(10);
    expect(shieldBlockChance(shield(ItemRarity.RARE, 10))).toBe(15);
    expect(shieldBlockChance(shield(ItemRarity.UNIQUE, 14))).toBe(10);
    expect(shieldBlockChance(shield(ItemRarity.UNIQUE, 15))).toBe(20);
  });

  it('does not give block chance to other equipment', () => {
    expect(shieldBlockChance({ equipmentType: [EquipmentType.WEAPON], rarity: ItemRarity.UNIQUE, level: 20 })).toBe(0);
  });
});
