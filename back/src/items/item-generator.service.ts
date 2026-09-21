import { Injectable } from '@nestjs/common';
import { AttributeType, EquipmentType, ItemRarity, StatType, type Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { BASE_ITEMS, BaseItem, Modifier, PREFIXES, RARITY_WEIGHTS, SUFFIXES } from './item-generator.config';
import { itemIdentity } from './item-identity';

interface GenerateItemOptions {
  baseItemName?: string;
  minimumRarity?: ItemRarity;
  level: number;
  equipmentType?: EquipmentType;
  rarity?: ItemRarity;
}

interface GeneratedModifier {
  modifier: Modifier;
  value: number;
}

const ITEM_LEVEL_PRICE_GROWTH = 0.26;
const RARITY_PRICE_MULTIPLIERS: Partial<Record<ItemRarity, number>> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.MAGIC]: 2,
  [ItemRarity.RARE]: 5,
  [ItemRarity.UNIQUE]: 15,
};

export const calculateGeneratedItemPrice = (basePrice: number, rarity: ItemRarity, level: number, modifiersValue = 0) =>
  Math.round(
    basePrice * (RARITY_PRICE_MULTIPLIERS[rarity] ?? 1) * (1 + Math.max(1, level) * ITEM_LEVEL_PRICE_GROWTH) +
      modifiersValue * 10,
  );

@Injectable()
export class ItemGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    options: GenerateItemOptions,
    client?: Prisma.TransactionClient,
  ): Promise<
    Prisma.ItemGetPayload<{
      include: { stats: { include: { stat: true } }; attributes: { include: { attribute: true } } };
    }>
  > {
    if (!client) return this.prisma.$transaction((tx) => this.generate(options, tx));
    // Serialize catalog generation across shop refreshes and battle drops.
    await client.$executeRaw`SELECT pg_advisory_xact_lock(7241901)`;
    const level = Math.max(1, options.level);

    const baseItem = this.pickBaseItem(options.equipmentType, options.baseItemName);

    const rarity = options.rarity ?? this.generateRarity();

    const modifiers = this.generateModifiers(baseItem.equipmentType, rarity, level);

    const name = this.generateName(baseItem, rarity, modifiers);

    const price = this.calculatePrice(baseItem, rarity, level, modifiers);

    const stats = new Map<StatType, number>();
    const attributes = new Map<AttributeType, number>();

    // Base характеристики предмета
    for (const [stat, value] of Object.entries(baseItem.baseStats ?? {})) {
      stats.set(stat as StatType, this.scaleBaseValue(value, level));
    }

    // Random affixes
    for (const { modifier, value } of modifiers) {
      if (modifier.kind === 'stat') {
        stats.set(modifier.stat, (stats.get(modifier.stat) ?? 0) + value);
      } else {
        attributes.set(modifier.attribute, (attributes.get(modifier.attribute) ?? 0) + value);
      }
    }

    const identity = itemIdentity({
      equipmentType: [baseItem.equipmentType],
      isConsumable: false,
      name,
      stats: [...stats].map(([name, value]) => ({ stat: { name }, value })),
      attributes: [...attributes].map(([name, value]) => ({ attribute: { name }, value })),
    });
    const candidates = await client.item.findMany({
      where: { equipmentType: { equals: [baseItem.equipmentType] }, isConsumable: false },
      include: { stats: { include: { stat: true } }, attributes: { include: { attribute: true } } },
      orderBy: { id: 'asc' },
    });
    const rarityOrder: ItemRarity[] = [ItemRarity.COMMON, ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.UNIQUE];
    const existing = candidates.find(
      (item) =>
        itemIdentity(item) === identity &&
        (!options.minimumRarity || rarityOrder.indexOf(item.rarity) >= rarityOrder.indexOf(options.minimumRarity)),
    );
    if (existing) {
      if (existing.level > level) {
        return client.item.update({
          where: { id: existing.id },
          data: {
            level,
            description: existing.description.replace(/level \d+/, `level ${level}`),
            price: Math.min(existing.price, price),
          },
          include: { stats: { include: { stat: true } }, attributes: { include: { attribute: true } } },
        });
      }
      return existing;
    }

    return client.item.create({
      data: {
        name,
        description: this.generateDescription(rarity, baseItem, level),
        price,
        icon: this.randomElement([baseItem.icon, ...(baseItem.iconVariants ?? [])]),
        rarity,
        equipmentType: [baseItem.equipmentType],
        level,

        stats: {
          create: Array.from(stats.entries()).map(([stat, value]) => ({
            stat: {
              connect: {
                name: stat,
              },
            },
            value,
          })),
        },

        attributes: {
          create: Array.from(attributes.entries()).map(([attribute, value]) => ({
            attribute: {
              connect: {
                name: attribute,
              },
            },
            value,
          })),
        },
      },

      include: {
        stats: {
          include: {
            stat: true,
          },
        },

        attributes: {
          include: {
            attribute: true,
          },
        },
      },
    });
  }

  private pickBaseItem(equipmentType?: EquipmentType, baseItemName?: string): BaseItem {
    const availableItems = BASE_ITEMS.filter(
      (item) =>
        (!equipmentType || item.equipmentType === equipmentType) && (!baseItemName || item.name === baseItemName),
    );

    if (!availableItems.length) {
      throw new Error(`No base items for equipment type ${equipmentType}`);
    }

    return this.randomElement(availableItems);
  }

  private generateRarity(): ItemRarity {
    const totalWeight = RARITY_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);

    let roll = Math.random() * totalWeight;

    for (const entry of RARITY_WEIGHTS) {
      roll -= entry.weight;

      if (roll <= 0) {
        return entry.rarity;
      }
    }

    return ItemRarity.COMMON;
  }

  private generateModifiers(equipmentType: EquipmentType, rarity: ItemRarity, level: number): GeneratedModifier[] {
    if (rarity === ItemRarity.COMMON) {
      return [];
    }

    const modifierCount =
      rarity === ItemRarity.MAGIC
        ? this.randomInt(1, 2)
        : rarity === ItemRarity.RARE
          ? this.randomInt(2, 3)
          : rarity === ItemRarity.UNIQUE
            ? this.randomInt(4, 5)
            : 0;

    const available = [...PREFIXES, ...SUFFIXES].filter((modifier) => modifier.equipmentTypes.includes(equipmentType));

    const selected: GeneratedModifier[] = [];
    const pool = [...available];
    // Every magic-or-better item has an attribute affix, regardless of its source.
    if (modifierCount > 0) {
      const attributePool = pool.filter((modifier) => modifier.kind === 'attribute');
      if (attributePool.length) {
        const modifier = this.randomElement(attributePool);
        pool.splice(pool.indexOf(modifier), 1);
        selected.push({ modifier, value: this.generateModifierValue(modifier, level) });
      }
    }

    while (selected.length < modifierCount && pool.length > 0) {
      const index = this.randomInt(0, pool.length - 1);
      const modifier = pool.splice(index, 1)[0];

      selected.push({
        modifier,
        value: this.generateModifierValue(modifier, level),
      });
    }

    return selected;
  }

  private generateModifierValue(modifier: Modifier, level: number): number {
    if (modifier.kind === 'stat') {
      const minRoll = Math.max(1, Math.round(modifier.min * (1 + Math.max(0, level - 1) * 0.12)));
      const maxRoll = Math.max(minRoll, Math.round(modifier.max * (1 + Math.max(0, level - 1) * 0.2)));
      return this.randomInt(minRoll, maxRoll);
    }

    const baseValue = this.randomInt(modifier.min, modifier.max);
    const levelMultiplier = 1 + Math.max(0, level - 1) * 0.025;

    return Math.max(1, Math.round(baseValue * levelMultiplier * 0.5));
  }

  private generateName(baseItem: BaseItem, rarity: ItemRarity, modifiers: GeneratedModifier[]): string {
    if (rarity === ItemRarity.COMMON) {
      return baseItem.name;
    }

    const prefix = modifiers.find(({ modifier }) => PREFIXES.includes(modifier));

    const suffix = modifiers.find(({ modifier }) => SUFFIXES.includes(modifier));

    return [prefix?.modifier.name, baseItem.name, suffix?.modifier.name].filter(Boolean).join(' ');
  }

  private calculatePrice(
    baseItem: BaseItem,
    rarity: ItemRarity,
    level: number,
    modifiers: GeneratedModifier[],
  ): number {
    const modifiersValue = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
    return calculateGeneratedItemPrice(baseItem.basePrice, rarity, level, modifiersValue);
  }

  private scaleBaseValue(value: number, level: number): number {
    return Math.max(1, Math.round(value * (1 + (level - 1) * 0.2)));
  }

  private generateDescription(rarity: ItemRarity, baseItem: BaseItem, level: number): string {
    return `${rarity} level ${level} ${baseItem.name.toLowerCase()}.`;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomElement<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
