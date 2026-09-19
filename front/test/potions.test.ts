import { describe, expect, it } from 'vitest';

import type { InventoryItemType } from '@/modules/Inventory/types';

import {
  getPotionCategory,
  getPotionColorScheme,
  getPotionRequiredLevel,
  getPotionTier,
  isHealthPotion,
  isPotion,
} from '@/modules/Inventory/utils/potions';

describe('potion utils and color schemes', () => {
  it('correctly categorizes potions based on name and description', () => {
    expect(getPotionCategory('Lesser Attack Potion')).toBe('ATTACK');
    expect(getPotionCategory('Greater Defense Potion')).toBe('DEFENSE');
    expect(getPotionCategory('Higher Experience Potion')).toBe('EXPERIENCE');
    expect(getPotionCategory('Free Attribute Potion')).toBe('FREE_ATTRIBUTE');
    expect(getPotionCategory('Mild Health Potion')).toBe('HEALTH');
    expect(getPotionCategory('Unknown Elixir')).toBe('UNKNOWN');
  });

  it('determines potion tier based on prefix or level', () => {
    expect(getPotionTier('Lesser Attack Potion', 10)).toBe(1);
    expect(getPotionTier('Medium Defense Potion', 20)).toBe(2);
    expect(getPotionTier('Moderate Defense Potion', 20)).toBe(2);
    expect(getPotionTier('Mild Experience Potion', 30)).toBe(3);
    expect(getPotionTier('Free Attribute Potion', 30)).toBe(3);
    expect(getPotionTier('Greater Attack Potion', 40)).toBe(4);
    expect(getPotionTier('Higher Defense Potion', 50)).toBe(5);
  });

  it('assigns consistent colors to potions of the same category regardless of tier', () => {
    const lesserAttack = getPotionColorScheme({ name: 'Lesser Attack Potion', level: 10 });
    const higherAttack = getPotionColorScheme({ name: 'Higher Attack Potion', level: 50 });

    expect(lesserAttack.category).toBe('ATTACK');
    expect(higherAttack.category).toBe('ATTACK');
    expect(lesserAttack.liquidTop).toBe(higherAttack.liquidTop);
    expect(lesserAttack.liquidBottom).toBe(higherAttack.liquidBottom);
    expect(lesserAttack.liquidTop).toBe('#facc15');
  });

  it('assigns distinct colors across different potion categories', () => {
    const attackColors = getPotionColorScheme({ name: 'Lesser Attack Potion' });
    const defenseColors = getPotionColorScheme({ name: 'Lesser Defense Potion' });
    const expColors = getPotionColorScheme({ name: 'Lesser Experience Potion' });
    const freeAttrColors = getPotionColorScheme({ name: 'Free Attribute Potion' });
    const healthColors = getPotionColorScheme({ name: 'Mild Health Potion' });

    expect(attackColors.liquidTop).not.toBe(defenseColors.liquidTop);
    expect(defenseColors.liquidTop).not.toBe(expColors.liquidTop);
    expect(expColors.liquidTop).not.toBe(freeAttrColors.liquidTop);
    expect(attackColors.liquidTop).not.toBe(healthColors.liquidTop);

    // Health is reserved red; Attack uses a clearly separate golden palette.
    expect(healthColors.liquidTop).toBe('#ef4444');
    expect(attackColors.liquidTop).toBe('#facc15');
  });

  it('identifies potions and health potions reliably', () => {
    const attackPotion: InventoryItemType = {
      equipmentType: ['POTION'],
      name: 'Lesser Attack Potion',
      nameKey: 'Lesser Attack Potion',
      icon: '',
    };
    const healthPotion: InventoryItemType = {
      equipmentType: ['POTION'],
      name: 'Lesser Health Potion',
      nameKey: 'Lesser Health Potion',
      icon: '',
    };
    const sword: InventoryItemType = {
      equipmentType: ['WEAPON'],
      name: 'Sword',
      nameKey: 'Sword',
      icon: '',
    };

    expect(isPotion(attackPotion)).toBe(true);
    expect(isPotion(healthPotion)).toBe(true);
    expect(isPotion(sword)).toBe(false);
    expect(isPotion(null)).toBe(false);

    expect(isHealthPotion(healthPotion)).toBe(true);
    expect(isHealthPotion(attackPotion)).toBe(false);
  });

  it('returns correct required levels for potions', () => {
    expect(getPotionRequiredLevel('Lesser Attack Potion')).toBe(10);
    expect(getPotionRequiredLevel('Medium Attack Potion')).toBe(20);
    expect(getPotionRequiredLevel('Mild Attack Potion')).toBe(30);
    expect(getPotionRequiredLevel('Free Attribute Potion')).toBe(30);
    expect(getPotionRequiredLevel('Greater Attack Potion')).toBe(40);
    expect(getPotionRequiredLevel('Higher Attack Potion')).toBe(50);
  });
});
