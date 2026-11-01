import { fortifySlowDungeonMinion, strengthenDungeonEnemy } from './dungeon-balance';

describe('dungeon enemy strength', () => {
  it('gives the one-step Cinder Stone Brute tank durability', () => {
    const enemy = { health: 70, maxHealth: 896, damage: 100, defense: 30, movement: 1 };
    fortifySlowDungeonMinion(enemy, 'Cinder Stone Brute', false);
    expect(enemy).toEqual({ health: 175, maxHealth: 2240, damage: 100, defense: 60, movement: 1 });
  });
  it.each(['Ossuary Colossus', 'Glacier Troll'])('fortifies the slow %s minion', (name) => {
    const enemy = { health: 500, maxHealth: 1000, damage: 100, defense: 30 };
    fortifySlowDungeonMinion(enemy, name, false);
    expect(enemy).toEqual({ health: 800, maxHealth: 1600, damage: 100, defense: 60 });
  });
  it.each([
    ['Icebound Sovereign', true],
    ['Flamebound Stalker', false],
    ['Ember Wraith', false],
    ['Bonebound Knight', false],
  ] as const)('does not give %s the slow-minion bonus', (name, boss) => {
    const enemy = { health: 500, maxHealth: 1000, damage: 100, defense: 30, movement: 1 };
    const original = { ...enemy };
    fortifySlowDungeonMinion(enemy, name, boss);
    expect(enemy).toEqual(original);
  });
  it('does not revive a dead tank', () => {
    const enemy = { health: 0, maxHealth: 896, damage: 100, defense: 30 };
    fortifySlowDungeonMinion(enemy, 'Cinder Stone Brute', false);
    expect(enemy.health).toBe(0);
  });
  it.each([
    [false, 1500, 130, 35],
    [true, 1750, 140, 38],
  ] as const)('strengthens boss=%s without healing lost health', (boss, maxHealth, damage, defense) => {
    const enemy = { health: 400, maxHealth: 1000, damage: 100, defense: 30, movement: 2 };
    strengthenDungeonEnemy(enemy, boss);
    expect(enemy).toEqual({ health: maxHealth * 0.4, maxHealth, damage, defense, movement: 2 });
  });
  it('caps armor, never revives, and keeps living low-HP opponents alive', () => {
    const dead = { health: 0, maxHealth: 1000, damage: 20, defense: 60 };
    strengthenDungeonEnemy(dead, true);
    expect(dead.health).toBe(0);
    expect(dead.defense).toBe(60);
    const alive = { health: 1, maxHealth: 1000, damage: 20, defense: 59 };
    strengthenDungeonEnemy(alive, false);
    expect(alive.health).toBeGreaterThan(0);
    expect(alive.defense).toBe(60);
  });
});
