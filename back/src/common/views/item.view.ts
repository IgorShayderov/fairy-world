import type { Prisma } from '../../../generated/client';

export type DetailedItem = Prisma.ItemGetPayload<{
  include: {
    attributes: { include: { attribute: true } };
    stats: { include: { stat: true } };
  };
}>;

export class ItemView {
  static render(item: DetailedItem) {
    const { attributes, stats, ...details } = item;

    return {
      ...details,
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
