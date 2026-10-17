import type { Prisma } from '../../../generated/client';
import { requiredPlayerLevel } from '../../users/level-progression';
import { isTwoHandedWeapon } from '../../items/weapon-types';
import { getPotionRequiredLevel } from '../../items/potion-effects';
import { shieldBlockChance } from '../../items/shield-block';
import { robeManaReduction } from '../../items/mage-equipment';

export type DetailedItem = Prisma.ItemGetPayload<{
  include: {
    attributes: { include: { attribute: true } };
    stats: { include: { stat: true } };
  };
}>;

export class ItemView {
  static render(item: DetailedItem) {
    const { attributes, stats, ...details } = item;
    const potionReqLevel = getPotionRequiredLevel(item.name);
    const consumableReq = potionReqLevel > 1 ? potionReqLevel : (item.level ?? 1);
    const blockChance = shieldBlockChance(item);

    return {
      ...details,
      requiredPlayerLevel: item.isConsumable ? consumableReq : requiredPlayerLevel(item.level),
      isTwoHanded: isTwoHandedWeapon(item.name),
      ...(blockChance ? { blockChance } : {}),
      attributes: attributes.map(({ attribute, value }) => ({
        name: attribute.name,
        description: attribute.description,
        value,
      })),
      properties: [
        ...stats.map(({ stat, value }) => ({
          name: stat.name,
          description: stat.description,
          value,
        })),
        ...(robeManaReduction(item)
          ? [
              {
                name: 'MANA_COST_REDUCTION',
                value: robeManaReduction(item),
                description: 'Reduces Mage spell mana costs by this percentage. Minimum spell cost: 1 mana.',
              },
            ]
          : []),
      ],
    };
  }
}
