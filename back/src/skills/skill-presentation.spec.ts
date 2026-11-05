import { SKILLS, skillBaseManaCost } from './skills.catalog';
import { skillPresentation } from './skill-presentation';

const skill = (id: string) => SKILLS.find((entry) => entry.id === id)!;
describe('skill rank presentation', () => {
  it.each(SKILLS.map((entry) => [entry.id]))('%s describes current effects and previews every upgrade', (id) => {
    const definition = skill(id);
    for (let rank = 0; rank <= definition.maxRank; rank++) {
      const view = skillPresentation(definition, rank);
      expect(view.description).not.toMatch(/per rank|additional rank|next rank|per \d+.*ranks/i);
      expect(view.description.length).toBeGreaterThan(5);
      if (rank === definition.maxRank) expect(view.nextRank).toBeUndefined();
      else {
        expect(view.nextRank?.rank).toBe(rank + 1);
        expect(view.nextRank?.changes.length).toBeGreaterThan(0);
        if (definition.effect)
          expect(view.nextRank?.changes).toContainEqual({
            label: 'Mana cost (before discounts)',
            before: rank ? String(skillBaseManaCost(definition, rank)) : null,
            after: String(skillBaseManaCost(definition, rank + 1)),
          });
      }
    }
  });
  it('shows exact Poisoned Arrow values instead of upgrade formulas', () => {
    const view = skillPresentation(skill('scout-volley'), 1);
    expect(view.description).toContain('80% weapon damage');
    expect(view.description).toContain('35% chance');
    expect(view.nextRank?.changes).toEqual([
      { label: 'Weapon damage', before: '80%', after: '84%' },
      { label: 'Petrification chance', before: '35%', after: '37%' },
      { label: 'Mana cost (before discounts)', before: '78', after: '80' },
    ]);
  });
  it('only previews the Frost Arrow slow increase at its actual rank threshold', () => {
    expect(
      skillPresentation(skill('scout-aim'), 4).nextRank?.changes.some((row) => row.label === 'Movement reduction'),
    ).toBe(false);
    expect(skillPresentation(skill('scout-aim'), 5).nextRank?.changes).toContainEqual({
      label: 'Movement reduction',
      before: '2 hexes',
      after: '3 hexes',
    });
  });
  it('shows cumulative passive effects, including both defense bonuses and critical stats', () => {
    expect(skillPresentation(skill('mage-ward'), 3).description).toBe('+15% defense rating, +6 flat defense rating.');
    expect(skillPresentation(skill('scout-evasion'), 2).nextRank?.changes).toEqual([
      { label: 'Critical damage', before: '+6%', after: '+9%' },
      { label: 'Critical chance', before: '+2%', after: '+3%' },
    ]);
  });
});
