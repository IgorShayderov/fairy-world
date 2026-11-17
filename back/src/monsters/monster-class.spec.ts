import { monsterClass, monsterDefenseCap, monsterDodgeCap } from './monster-class';

describe('monster classes', () => {
  it.each(['Stone Golem', 'Cinder Stone Brute', 'Icebound Sovereign', 'Bonebound Knight'])(
    'gives %s tank caps',
    (type) => {
      expect(monsterClass(type)).toBe('TANK');
      expect(monsterDefenseCap(type)).toBe(65);
      expect(monsterDodgeCap(type)).toBe(25);
    },
  );
  it('preserves ordinary caps for other classes', () => {
    expect(monsterClass('Frost Wraith')).toBe('MAGE');
    expect(monsterClass('Dire Wolf')).toBe('FIGHTER');
    expect(monsterDefenseCap('Frost Wraith')).toBe(50);
    expect(monsterDodgeCap('Dire Wolf')).toBe(30);
  });
});
