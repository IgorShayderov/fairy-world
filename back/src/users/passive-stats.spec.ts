import { SKILLS } from '../skills/skills.catalog';
import { UserView } from './user.view';

function render(playerClass: string, ranks: Record<string, number>, buff = false) {
  return UserView.renderCurrent({
    id: 1,
    name: 'Hero',
    gameProfile: {
      level: 20,
      skillTree: { class: playerClass, ranks },
      buffs: buff ? [{ type: 'DAMAGE', value: 15, expiresAt: new Date(Date.now() + 60000) }] : [],
      inventory: ['Bow', 'Arrows'].map((name, index) => ({
        isEquiped: true,
        slot: index ? 'right-hand' : 'left-hand',
        quantity: 1,
        item: {
          name,
          level: 1,
          rarity: 'COMMON',
          equipmentType: [index ? 'AMMUNITION' : 'WEAPON'],
          attributes: [],
          stats: [],
          isConsumable: false,
        },
      })),
    },
  } as unknown as Parameters<typeof UserView.renderCurrent>[0]);
}

describe('permanent passive stats', () => {
  it.each(SKILLS.filter((skill) => !skill.effect))('$name is a normal stat, never a temporary buff', (skill) => {
    const result = render(skill.class, { [skill.id]: 4 });
    expect(result.activeBuffs).toEqual([]);
    for (const property of result.properties) {
      expect(property.buffBonus ?? 0).toBe(0);
      expect(property.buffRatingBonus ?? 0).toBe(0);
    }
  });

  it('keeps real temporary buffs visible when skills also add damage', () => {
    const result = render('SCOUT', { 'scout-precision': 10 }, true);
    expect(result.properties.find((p) => p.name === 'DAMAGE')?.buffBonus).toBe(15);
    expect(result.activeBuffs).toEqual([expect.objectContaining({ type: 'DAMAGE', value: 15 })]);
  });

  it('gives Warrior the improved damage, armor and health progression', () => {
    const base = render('WARRIOR', {});
    const result = render('WARRIOR', { 'warrior-might': 10, 'warrior-armor': 4, 'warrior-vitality': 4 });
    const stat = (view: typeof base, name: string) => view.properties.find((p) => p.name === name)!;
    expect(stat(result, 'DAMAGE').value).toBe(Math.round(stat(base, 'DAMAGE').value * 1.3));
    expect(stat(result, 'HEALTH').value).toBe(Math.round(stat(base, 'HEALTH').value * 1.2));
    expect(stat(result, 'DEFENSE').rating).toBe(Math.round(stat(base, 'DEFENSE').rating! * 1.2) + 8);
  });

  it('improves Mage resources and armor without turning spell power into weapon damage', () => {
    const base = render('MAGE', {});
    const result = render('MAGE', { 'mage-focus': 10, 'mage-reservoir': 4, 'mage-ward': 4 });
    const stat = (view: typeof base, name: string) => view.properties.find((p) => p.name === name)!;
    expect(stat(result, 'MANA').value).toBe(Math.round(stat(base, 'MANA').value * 1.2));
    expect(stat(result, 'DEFENSE').rating).toBe(Math.round(stat(base, 'DEFENSE').rating! * 1.2) + 8);
    expect(stat(result, 'DAMAGE').value).toBe(stat(base, 'DAMAGE').value);
    expect(result.spellPower).toBe(Math.round(base.spellPower * 1.3));
  });
});
