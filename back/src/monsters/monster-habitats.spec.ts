import { habitatAt, MONSTER_HABITATS } from './monster-habitats';
import { MONSTER_ARCHETYPES } from './monster-generator.config';
import { MonsterGeneratorService } from './monster-generator.service';

describe('regional encounters', () => {
  afterEach(() => jest.restoreAllMocks());
  it('assigns every species to a hunting region', () => {
    expect(MONSTER_HABITATS.flatMap((h) => [...h.monsters]).sort()).toEqual(
      MONSTER_ARCHETYPES.map((m) => m.name).sort(),
    );
    for (const region of MONSTER_HABITATS) expect(habitatAt(region)).toBe(region);
  });
  it('generates every local species and excludes unrelated monsters', () => {
    const generator = new MonsterGeneratorService();
    for (const region of MONSTER_HABITATS) {
      for (const [index, species] of region.monsters.entries()) {
        const roll = (index + 0.5) / region.monsters.length;
        jest.spyOn(Math, 'random').mockReturnValue(roll);
        expect(generator.generate(10, region).monsterType).toBe(species);
      }
    }
  });
  it('uses exclusive lake and bog species only inside their special habitats', () => {
    expect(habitatAt({ x: 360, y: 1120 }).key).toBe('lake_shores');
    expect(habitatAt({ x: 420, y: 1510 }).key).toBe('mirelands');
    expect(habitatAt({ x: 1470, y: 1040 }).key).toBe('crossroads');
  });
});
