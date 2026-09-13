import { itemIdentity } from './item-identity';

describe('itemIdentity', () => {
  const ring = {
    name: 'Ring',
    equipmentType: ['RING'],
    isConsumable: false,
    stats: [{ stat: { name: 'CRIT' }, value: 9 }],
    attributes: [{ attribute: { name: 'STRENGTH' }, value: 2 }],
  };
  it('ignores cosmetic names and zero bonuses', () => {
    expect(itemIdentity(ring)).toBe(
      itemIdentity({ ...ring, name: 'Different ring', stats: [...ring.stats, { stat: { name: 'MANA' }, value: 0 }] }),
    );
  });
  it('keeps different types, attributes and properties separate', () => {
    for (const different of [
      { ...ring, equipmentType: ['AMULET'] },
      { ...ring, attributes: [] },
      { ...ring, stats: [{ stat: { name: 'CRIT' }, value: 10 }] },
    ])
      expect(itemIdentity(different)).not.toBe(itemIdentity(ring));
  });
  it('does not merge different consumable effects with empty stats', () => {
    const potion = {
      name: 'Lesser Health Potion',
      equipmentType: ['POTION'],
      isConsumable: true,
      stats: [],
      attributes: [],
    };
    expect(itemIdentity(potion)).not.toBe(itemIdentity({ ...potion, name: 'Lesser Attack Potion' }));
  });
});
