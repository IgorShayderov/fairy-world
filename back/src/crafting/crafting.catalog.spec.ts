import { CraftUpgradeType } from '../../generated/client';
import { rollCraftMaterialCode, upgradeValueForLevel } from './crafting.catalog';

describe('crafting catalog', () => {
  it('scales damage and defense upgrades from level 5 every three levels', () => {
    expect(upgradeValueForLevel(CraftUpgradeType.DAMAGE, 1)).toBe(1);
    expect(upgradeValueForLevel(CraftUpgradeType.DAMAGE, 5)).toBe(1);
    expect(upgradeValueForLevel(CraftUpgradeType.DAMAGE, 8)).toBe(2);
    expect(upgradeValueForLevel(CraftUpgradeType.DAMAGE, 18)).toBe(5);
    expect(upgradeValueForLevel(CraftUpgradeType.DEFENSE, 18)).toBe(5);
  });

  it('scales reward and health upgrades from the same tier', () => {
    expect(upgradeValueForLevel(CraftUpgradeType.GOLD, 18)).toBe(10);
    expect(upgradeValueForLevel(CraftUpgradeType.EXPERIENCE, 18)).toBe(10);
    expect(upgradeValueForLevel(CraftUpgradeType.HEALTH, 18)).toBe(50);
  });

  it('can drop a crafting material from an ordinary encounter', () => {
    const random = jest.fn().mockReturnValueOnce(0.1).mockReturnValueOnce(0);
    expect(rollCraftMaterialCode(random)).toBe('IRON_ORE');
  });

  it('returns no crafting material when the drop roll fails', () => {
    expect(rollCraftMaterialCode(() => 0.99)).toBeNull();
  });
});
