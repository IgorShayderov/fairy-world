import { rangedWeapon } from './weapon-types';

// Ranged weapon and ammunition kinds affect combat even with identical bonuses.
// Consumable effects are name-based, so they must never be merged across names.
export function itemIdentity(item: {
  equipmentType: string[];
  isConsumable: boolean;
  name: string;
  stats: Array<{ stat: { name: string }; value: number }>;
  attributes: Array<{ attribute: { name: string }; value: number }>;
}) {
  return JSON.stringify([
    [...item.equipmentType].sort(),
    item.equipmentType.includes('WEAPON')
      ? rangedWeapon(item.name)
      : item.equipmentType.includes('AMMUNITION')
        ? /\bbolts\b/i.test(item.name)
          ? 'BOLTS'
          : 'ARROWS'
        : null,
    item.isConsumable || item.equipmentType.some((type) => ['POTION', 'SCROLL', 'UNKNOWN'].includes(type))
      ? item.name
      : null,
    item.isConsumable,
    item.stats
      .filter((entry) => entry.value !== 0)
      .map(({ stat, value }) => [stat.name, value])
      .sort(),
    item.attributes
      .filter((entry) => entry.value !== 0)
      .map(({ attribute, value }) => [attribute.name, value])
      .sort(),
  ]);
}
