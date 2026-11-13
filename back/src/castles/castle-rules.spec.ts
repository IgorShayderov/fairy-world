import { accrue, armyPower, defensePower, raidLoot, raidResult, storageCapacity, upgradeCost } from './castle-rules';
import { castleSite, castleMountains, castleHasClearance, uncrowdedCastleSite, CASTLE_CITIES } from './castle-terrain';

describe('castle rules', () => {
  const base = () => ({
    keep: 2,
    lumberMill: 1,
    quarry: 1,
    storehouse: 0,
    barracks: 1,
    forge: 0,
    wood: 0,
    stone: 0,
    producedAt: new Date('2026-01-01'),
  });
  it('produces while offline, preserves fractions, and caps both stores', () => {
    const c = base();
    accrue(c, new Date('2026-01-01T00:00:30Z'));
    expect(c.wood).toBe(1);
    expect(c.stone).toBe(0.75);
    accrue(c, new Date('2026-01-01T01:00:00Z'));
    expect(c.wood).toBe(120);
    expect(c.stone).toBe(90);
    accrue(c, new Date('2027-01-01'));
    expect(c.wood).toBe(storageCapacity(c));
    expect(c.stone).toBe(storageCapacity(c));
  });
  it('does not rewind production clocks', () => {
    const c = base();
    accrue(c, new Date('2025-01-01'));
    expect(c.producedAt).toEqual(new Date('2026-01-01'));
    expect(c.wood).toBe(0);
  });
  it('scales construction, army strength and keep defenses', () => {
    expect(upgradeCost('keep', 2).wood).toBeGreaterThan(upgradeCost('keep', 1).wood);
    expect(armyPower({ sentinels: 10, rangers: 0, arcanists: 0 }, 2)).toBe(120);
    expect(defensePower({ keep: 2, forge: 2, sentinels: 10, rangers: 0, arcanists: 0 })).toBe(220);
  });
  it('gives independent towers their defense, with exactly double mage costs and time', () => {
    const base = { keep: 9, forge: 0, sentinels: 0, rangers: 0, arcanists: 0 };
    expect(defensePower({ ...base, arrowTower1: 2, arrowTower2: 1, mageTower1: 2, mageTower2: 1, gates: 1 })).toBe(
      1300,
    );
    for (let level = 1; level <= 10; level++) {
      const arrow = upgradeCost('arrowTower1', level);
      expect(upgradeCost('mageTower1', level)).toEqual({
        wood: arrow.wood * 2,
        stone: arrow.stone * 2,
        seconds: arrow.seconds * 2,
      });
      expect(upgradeCost('mageTower2', level)).toEqual(upgradeCost('mageTower1', level));
    }
  });
  it('limits actual transferred loot to 10% and free storage', () => {
    expect(raidLoot({ wood: 999, stone: 1000 }, { wood: 10, stone: 500 })).toEqual({ wood: 10, stone: 100 });
  });
  it('bounds casualties for victory, defeat and empty unit types', () => {
    expect(raidResult(100, 100, { sentinels: 10, rangers: 0, arcanists: 0 })).toEqual({
      victory: true,
      losses: { sentinels: 4, rangers: 0, arcanists: 0 },
    });
    expect(raidResult(50, 100, { sentinels: 5, rangers: 0, arcanists: 0 }).losses.sentinels).toBe(4);
    expect(raidResult(10000, 1, { sentinels: 1, rangers: 0, arcanists: 0 }).losses.sentinels).toBe(1);
  });
});

describe('castle placement', () => {
  it('allows clear land near a city', () => {
    expect(castleSite(1100, 770)).toMatchObject({ valid: true, city: 'AURELIA' });
  });
  it('allows closer plots without covering wide landmark labels or the Moonward Stones', () => {
    expect(castleSite(940, 810).valid).toBe(true);
    expect(castleHasClearance(1140, 620)).toBe(false);
    expect(castleHasClearance(1220, 600)).toBe(false);
    expect(castleSite(940, 900).valid).toBe(false);
  });
  it.each([
    [1100, 650],
    [1220, 600],
    [940, 920],
  ])('relocates legacy plot %s,%s once, close to its original city', (x, y) => {
    const moved = uncrowdedCastleSite({ x, y, city: 'AURELIA' });
    expect(moved).not.toBeNull();
    expect(castleSite(moved!.x, moved!.y)).toMatchObject({ valid: true, city: 'AURELIA' });
    expect(Math.hypot(moved!.x - 940, moved!.y - 620)).toBeLessThanOrEqual(260);
    expect(uncrowdedCastleSite({ ...moved!, city: 'AURELIA' })).toBeNull();
  });
  it.each([
    [NaN, 650],
    [Infinity, 650],
    [-1, 0],
    [3201, 2101],
    [0, 0],
    [1470, 960],
    [940, 620],
    [470, 590],
    [790, 1220],
    [420, 1510],
    [2060, 550],
    [2000, 630],
  ])('rejects forbidden plot %s,%s', (x, y) => {
    expect(castleSite(x, y).valid).toBe(false);
  });
  it('rejects mountain footprints', () => {
    for (const mountain of castleMountains) expect(castleSite(mountain.x, mountain.y).valid).toBe(false);
  });
  it('offers at least one open plot near every eligible city', () => {
    for (const city of CASTLE_CITIES) {
      let valid = 0;
      for (let x = city.x - 300; x <= city.x + 300; x += 40)
        for (let y = city.y - 300; y <= city.y + 300; y += 40) if (castleSite(x, y).valid) valid++;
      expect(valid).toBeGreaterThan(0);
    }
  });
});
