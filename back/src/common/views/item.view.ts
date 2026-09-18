import type { Prisma } from '../../../generated/client';
import { requiredPlayerLevel } from '../../users/level-progression';
import { isTwoHandedWeapon } from '../../items/weapon-types';
import { getPotionRequiredLevel } from '../../items/potion-effects';

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

    return {
      ...details,
      requiredPlayerLevel: item.isConsumable ? consumableReq : requiredPlayerLevel(item.level),
      isTwoHanded: isTwoHandedWeapon(item.name),
      attributes: attributes.map(({ attribute, value }) => ({
        name: attribute.name,
        description: attribute.description,
        value,
      })),
      properties: stats.map(({ stat, value }) => ({
        name: stat.name,
        description: stat.description,
        value,
      })),
    };
  }
}
