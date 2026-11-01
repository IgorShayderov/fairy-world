import { canShoot, weaponAttackRange } from './battle-range';
import { matchingAmmunition, rangedWeapon } from '../items/weapon-types';

describe('ranged combat', () => {
  it('gives loaded bows and crossbows unlimited distance, including old saved ranges', () => {
    for (const oldRange of [6, 7]) {
      expect(canShoot(0, 76, 11, weaponAttackRange(oldRange), [])).toBe(true);
    }
    expect(canShoot(0, 76, 11, weaponAttackRange(1), [])).toBe(false);
    expect(canShoot(16, 23, 8, weaponAttackRange(6), [20])).toBe(false);
  });
  it('enforces range and obstacles on the hex grid', () => {
    expect(canShoot(16, 23, 8, 6, [])).toBe(false);
    expect(canShoot(17, 23, 8, 6, [])).toBe(true);
    expect(canShoot(16, 23, 8, 7, [])).toBe(true);
    expect(canShoot(16, 23, 8, 7, [20])).toBe(false);
    expect(canShoot(23, 16, 8, 7, [20])).toBe(false);
    expect(canShoot(16, 17, 8, 6, [])).toBe(true);
  });
  it('identifies weapons and matching ammunition', () => {
    expect(rangedWeapon('Sharp Crossbow of Wisdom')).toBe('CROSSBOW');
    expect(rangedWeapon('Bow of Strength')).toBe('BOW');
    expect(rangedWeapon('Sword')).toBeNull();
    expect(matchingAmmunition('Bow', 'Arrows')).toBe(true);
    expect(matchingAmmunition('Crossbow', 'Bolts')).toBe(true);
    expect(matchingAmmunition('Bow', 'Bolts')).toBe(false);
    expect(matchingAmmunition('Sword', 'Arrows')).toBe(false);
  });
});
