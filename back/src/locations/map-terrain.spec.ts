import { canRetreatAt, encounterChanceAt, isInBog, isInForest } from './map-terrain';

describe('map terrain', () => {
  it('uses route, open-land, and difficult-terrain encounter chances', () => {
    expect(encounterChanceAt({ x: 1470, y: 960 })).toBe(0.1);
    expect(encounterChanceAt({ x: 1400, y: 800 })).toBe(0.2);
    expect(encounterChanceAt({ x: 790, y: 1220 })).toBe(0.3);
    expect(encounterChanceAt({ x: 420, y: 1510 })).toBe(0.3);
  });

  it('classifies forest and bog coordinates', () => {
    expect(isInForest({ x: 790, y: 1220 })).toBe(true);
    expect(isInBog({ x: 420, y: 1510 })).toBe(true);
    expect(isInForest({ x: 1400, y: 800 })).toBe(false);
    expect(isInBog({ x: 1400, y: 800 })).toBe(false);
  });

  it('permits retreat on roads and inside town activation areas only', () => {
    expect(canRetreatAt({ x: 1470, y: 960 })).toBe(true);
    expect(canRetreatAt({ x: 1500, y: 950 })).toBe(true);
    expect(canRetreatAt({ x: 1400, y: 800 })).toBe(false);
  });
});
