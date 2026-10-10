import { monsterMovement, playerMovement, MONSTER_MOVEMENT } from './battle-movement';
import { MONSTER_ARCHETYPES } from './monster-generator.config';

describe('tactical movement stats', () => {
  it('scales player movement with total agility and caps it', () => {
    expect([0, 9, 10, 19, 20, 29, 30, 1000].map(playerMovement)).toEqual([3, 3, 4, 4, 5, 5, 6, 6]);
    expect(playerMovement(-10)).toBe(3);
    expect(playerMovement(NaN)).toBe(3);
  });
  it('defines a movement range for every monster archetype', () => {
    for (const { name } of MONSTER_ARCHETYPES) {
      expect(MONSTER_MOVEMENT[name]).toBeGreaterThanOrEqual(1);
      expect(MONSTER_MOVEMENT[name]).toBeLessThanOrEqual(5);
    }
    expect(monsterMovement('Stone Golem')).toBe(1);
    expect(monsterMovement('Dire Wolf')).toBe(4);
    expect(monsterMovement('Storm Harpy')).toBe(5);
    expect(monsterMovement('Unknown')).toBe(2);
  });
});
