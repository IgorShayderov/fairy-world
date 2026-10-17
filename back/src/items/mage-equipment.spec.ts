import { ItemRarity, StatType, AttributeType } from '../../generated/client';
import { BASE_ITEMS } from './item-generator.config';
import { magicSkillManaCost, robeManaReduction } from './mage-equipment';
import { isTwoHandedWeapon } from './weapon-types';
import { itemIdentity } from './item-identity';

describe('mage equipment', () => {
  it('trades physical damage and defense for Wisdom and mana', () => {
    const staff = BASE_ITEMS.find((item) => item.name === 'Two-handed Staff')!;
    const robe = BASE_ITEMS.find((item) => item.name === 'Mage Robe')!;
    const sword = BASE_ITEMS.find((item) => item.name === 'Two-handed Sword')!;
    const armor = BASE_ITEMS.find((item) => item.name === 'Armor')!;
    expect(staff.baseStats![StatType.DAMAGE]).toBeLessThan(sword.baseStats![StatType.DAMAGE]!);
    expect(robe.baseStats![StatType.DEFENSE]).toBeLessThan(armor.baseStats![StatType.DEFENSE]!);
    for (const item of [staff, robe]) {
      expect(item.baseStats![StatType.MANA]).toBeGreaterThan(0);
      expect(item.baseAttributes![AttributeType.WISDOM]).toBeGreaterThan(0);
    }
    expect(isTwoHandedWeapon(staff.name)).toBe(true);
  });
  it('reduces Mage costs only, rounds safely and never makes spells free', () => {
    expect(robeManaReduction({ name: 'Mage Robe of Wisdom', rarity: ItemRarity.UNIQUE })).toBe(20);
    expect(robeManaReduction({ name: 'Armor', rarity: ItemRarity.UNIQUE })).toBe(0);
    expect(magicSkillManaCost(10, 'MAGE', 20)).toBe(8);
    expect(magicSkillManaCost(18, 'MAGE', 15)).toBe(16);
    expect(magicSkillManaCost(8, 'WARRIOR', 20)).toBe(8);
    expect(magicSkillManaCost(1, 'MAGE', 100)).toBe(1);
  });
  it('does not merge robes with different efficiency or staves with other weapons', () => {
    const robe = {
      name: 'Mage Robe',
      rarity: 'COMMON',
      equipmentType: ['BODY'],
      isConsumable: false,
      stats: [],
      attributes: [],
    };
    expect(itemIdentity(robe)).not.toBe(itemIdentity({ ...robe, rarity: 'RARE' }));
    expect(itemIdentity({ ...robe, name: 'Two-handed Staff', equipmentType: ['WEAPON'] })).not.toBe(
      itemIdentity({ ...robe, name: 'Two-handed Sword', equipmentType: ['WEAPON'] }),
    );
  });
});
