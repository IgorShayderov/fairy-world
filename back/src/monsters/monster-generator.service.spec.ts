import { AttributeType } from '../../generated/client';
import { MONSTER_ARCHETYPES } from './monster-generator.config';
import { MonsterGeneratorService } from './monster-generator.service';

describe('MonsterGeneratorService', () => {
  const service = new MonsterGeneratorService();

  afterEach(() => jest.restoreAllMocks());

  it('generates a varied archetype close to the player level', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const monster = service.generate(100);

    expect(monster.level).toBe(100);
    expect(monster.name).toBe(`Wandering ${MONSTER_ARCHETYPES[0].name}`);
    expect(monster.monsterType).toBe(MONSTER_ARCHETYPES[0].name);
    expect(monster.rewardGold).toBeGreaterThan(0);
    expect(monster.rewardExperience).toBeGreaterThan(0);
    expect(monster.attributes).toEqual([
      { value: 58, attribute: { name: AttributeType.AGILITY } },
      { value: 57, attribute: { name: AttributeType.STRENGTH } },
    ]);
  });

  it('never generates a monster below level one', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect(service.generate(1).level).toBe(1);
  });

  it('can generate every configured archetype instead of one closest seeded monster', () => {
    expect(MONSTER_ARCHETYPES.length).toBeGreaterThanOrEqual(10);
  });

  it('does not generate exclusive lake or bog monsters without matching terrain coordinates', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(['Lake Serpent', 'Drowned Siren', 'Bog Lurker', 'Mire Hag']).not.toContain(service.generate(10).monsterType);
  });
});
