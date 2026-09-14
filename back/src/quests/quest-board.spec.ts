import { generateTownOffers } from './quest-board';
import { TOWNS, townQuestCount } from '../locations/towns';
import { habitatForMonster } from '../monsters/monster-habitats';

describe('daily town boards', () => {
  const now = new Date('2026-09-13T12:00:00Z');
  it('keeps offers stable on reload but varies towns and days', () => {
    const offers = generateTownOffers(TOWNS[0], now);
    expect(generateTownOffers(TOWNS[0], new Date('2026-09-13T23:59:59Z'))).toEqual(offers);
    expect(generateTownOffers(TOWNS[1], now)).not.toEqual(offers);
    expect(generateTownOffers(TOWNS[0], new Date('2026-09-14T00:00:00Z'))).not.toEqual(offers);
    const signatures = TOWNS.map((town) =>
      generateTownOffers(town, now)
        .map((q) => `${q.monsterType}:${q.target}`)
        .join(','),
    );
    expect(new Set(signatures).size).toBe(TOWNS.length);
  });
  it('offers three distinct types with attainable targets and matching habitats', () => {
    for (const town of TOWNS) {
      const offers = generateTownOffers(town, now);
      expect(new Set(offers.map((q) => q.monsterType)).size).toBe(townQuestCount(town.shopId));
      for (const quest of offers) {
        expect(quest.target).toBeGreaterThanOrEqual(8);
        expect(quest.target).toBeLessThanOrEqual(20);
        expect(quest.regionKey).toBe(habitatForMonster(quest.monsterType)?.key);
        expect(quest.expiresAt).toEqual(new Date('2026-09-14T00:00:00Z'));
        expect(quest.townId).toBe(town.shopId);
      }
    }
  });
});
