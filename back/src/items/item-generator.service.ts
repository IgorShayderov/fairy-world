import { Injectable } from '@nestjs/common';
import { AttributeType, EquipmentType, ItemRarity, StatType, type Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { BASE_ITEMS, BaseItem, Modifier, PREFIXES, RARITY_WEIGHTS, SUFFIXES } from './item-generator.config';

interface GenerateItemOptions {
  level: number;
  equipmentType?: EquipmentType;
  rarity?: ItemRarity;
}

interface GeneratedModifier {
  modifier: Modifier;
  value: number;
}

@Injectable()
export class ItemGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(options: GenerateItemOptions, client: Pick<Prisma.TransactionClient, 'item'> = this.prisma) {
    const level = Math.max(1, options.level);

    const baseItem = this.pickBaseItem(options.equipmentType);

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

    return client.item.create({
      data: {
        name,
        description: this.generateDescription(rarity, baseItem, level),
        price,
        icon: baseItem.icon,
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

  private pickBaseItem(equipmentType?: EquipmentType): BaseItem {
    const availableItems = equipmentType
      ? BASE_ITEMS.filter((item) => item.equipmentType === equipmentType)
      : BASE_ITEMS;

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
      rarity === ItemRarity.MAGIC ? this.randomInt(1, 2) : rarity === ItemRarity.RARE ? this.randomInt(3, 5) : 0;

    const available = [...PREFIXES, ...SUFFIXES].filter((modifier) => modifier.equipmentTypes.includes(equipmentType));

    const selected: GeneratedModifier[] = [];
    const pool = [...available];

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
    const baseValue = this.randomInt(modifier.min, modifier.max);

    /*
     * Пока простое масштабирование.
     *
     * lvl 1  => x1
     * lvl 10 => примерно x1.45
     * lvl 20 => примерно x1.95
     * lvl 50 => примерно x3.45
     */
    const levelMultiplier = 1 + Math.max(0, level - 1) * 0.05;

    return Math.max(1, Math.round(baseValue * levelMultiplier));
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
    const rarityMultiplier: Partial<Record<ItemRarity, number>> = {
      [ItemRarity.COMMON]: 1,
      [ItemRarity.MAGIC]: 2,
      [ItemRarity.RARE]: 5,
      [ItemRarity.UNIQUE]: 15,
    };

    const modifiersValue = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

    return Math.round(baseItem.basePrice * (rarityMultiplier[rarity] ?? 1) * (1 + level * 0.1) + modifiersValue * 10);
  }

  private scaleBaseValue(value: number, level: number): number {
    return Math.max(1, Math.round(value * (1 + (level - 1) * 0.08)));
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
