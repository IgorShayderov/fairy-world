import { UserView } from './user.view';

function render(ranks: Record<string, number>, loaded = true) {
  const equipment = (name: string, slot: string, equipmentType: string[]) => ({
    isEquiped: true,
    slot,
    quantity: 1,
    item: { name, level: 1, rarity: 'COMMON', equipmentType, attributes: [], stats: [], isConsumable: false },
  });
  return UserView.renderCurrent({
    id: 1,
    name: 'Scout',
    gameProfile: {
      level: 20,
      skillTree: { class: 'SCOUT', ranks },
      inventory: [
        equipment('Bow', 'left-hand', ['WEAPON']),
        ...(loaded ? [equipment('Arrows', 'right-hand', ['AMMUNITION'])] : []),
      ],
    },
  } as unknown as Parameters<typeof UserView.renderCurrent>[0]);
}
describe('Scout passive balance', () => {
  it('adds exact critical percentage points and no longer increases dodge', () => {
    const base = render({});
    const skilled = render({ 'scout-evasion': 4 });
    const value = (view: typeof base, stat: string) => view.properties.find((p) => p.name === stat)!.value;
    expect(value(skilled, 'CRIT')).toBeCloseTo(value(base, 'CRIT') + 4);
    expect(value(skilled, 'CRIT_DAMAGE')).toBeCloseTo(value(base, 'CRIT_DAMAGE') + 12);
    expect(value(skilled, 'DODGE')).toBe(value(base, 'DODGE'));
  });
  it('grants 5% health and 2 defense rating for each Survivalist rank', () => {
    const base = render({});
    const skilled = render({ 'scout-survival': 4 });
    expect(skilled.properties.find((p) => p.name === 'HEALTH')!.value).toBe(
      Math.round(base.properties.find((p) => p.name === 'HEALTH')!.value * 1.2),
    );
    expect(skilled.properties.find((p) => p.name === 'DEFENSE')!.rating).toBe(
      base.properties.find((p) => p.name === 'DEFENSE')!.rating! + 8,
    );
  });
  it('grants 3% damage per Precision rank only with matching ammunition', () => {
    const damage = (view: ReturnType<typeof render>) => view.properties.find((p) => p.name === 'DAMAGE')!.value;
    expect(damage(render({ 'scout-precision': 10 }))).toBe(Math.round(damage(render({})) * 1.3));
    expect(damage(render({ 'scout-precision': 10 }, false))).toBe(damage(render({}, false)));
  });
});
