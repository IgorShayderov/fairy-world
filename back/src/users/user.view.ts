import { UserModel } from '../../generated/models';
import { AttributeType, PlayerBuffType, StatType, type Prisma } from '../../generated/client';
import { ItemView } from '../common/views/item.view';
import { townAt } from '../locations/towns';
import { experienceToNextLevel, MAX_PLAYER_LEVEL } from './level-progression';
import {
  ATTRIBUTE_EFFECTS,
  convertRatingToPercentage,
  PROPERTY_DESCRIPTIONS,
  STARTING_ATTRIBUTE_VALUE,
  STARTING_PROPERTIES,
} from './player-defaults';

type CurrentUserModel = Prisma.UserGetPayload<{
  include: {
    gameProfile: {
      include: {
        inventory: {
          include: {
            item: {
              include: {
                attributes: { include: { attribute: true } };
                stats: { include: { stat: true } };
              };
            };
          };
        };
        profileAttributes: { include: { attribute: true } };
        profileStats: { include: { stat: true } };
        buffs: true;
        dungeonVisits: true;
      };
    };
  };
}>;

type EffectiveModifier = {
  name: string;
  description: string | null;
  baseValue: number;
  attributeBonus?: number;
  equipmentBonus: number;
  value: number;
  rating?: number;
  equipmentRatingBonus?: number;
  buffBonus?: number;
  buffRatingBonus?: number;
};

// 1. Задаем строгий тип для возможных вариантов view.
// Это даст идеальный автокомплит при вызове метода.
export type UserViewType = 'default' | 'extended';

export class UserView {
  static renderCurrent(user: CurrentUserModel) {
    const profile = user.gameProfile;
    const playerLevel = profile?.level ?? 1;
    const entries = profile?.inventory ?? [];
    const equippedEntries = entries.filter((entry) => entry.isEquiped);
    const renderEntry = (entry: (typeof entries)[number]) => ({
      ...entry,
      item: ItemView.render(entry.item),
    });

    const attributes = new Map<AttributeType, EffectiveModifier>(
      Object.values(AttributeType).map((name) => [
        name,
        {
          name,
          description: ATTRIBUTE_EFFECTS[name].description,
          baseValue: STARTING_ATTRIBUTE_VALUE,
          equipmentBonus: 0,
          value: STARTING_ATTRIBUTE_VALUE,
        },
      ]),
    );
    const properties = new Map<StatType, EffectiveModifier>(
      Object.values(StatType).map((name) => [
        name,
        {
          name,
          description: PROPERTY_DESCRIPTIONS[name],
          baseValue: STARTING_PROPERTIES[name],
          attributeBonus: 0,
          equipmentBonus: 0,
          value: STARTING_PROPERTIES[name],
        },
      ]),
    );

    for (const { attribute, value } of profile?.profileAttributes ?? []) {
      attributes.set(attribute.name, {
        name: attribute.name,
        description: ATTRIBUTE_EFFECTS[attribute.name].description,
        baseValue: value,
        equipmentBonus: 0,
        value,
      });
    }
    for (const { stat, value } of profile?.profileStats ?? []) {
      properties.set(stat.name, {
        name: stat.name,
        description: stat.description ?? PROPERTY_DESCRIPTIONS[stat.name],
        baseValue: value,
        attributeBonus: 0,
        equipmentBonus: 0,
        value,
      });
    }

    // Derived from level so profile and combat agree, including existing characters.
    for (const [name, perLevel] of [
      [StatType.HEALTH, 10],
      [StatType.MANA, 5],
    ] as const) {
      const property = properties.get(name)!;
      const bonus = Math.max(0, Math.min(100, playerLevel) - 1) * perLevel;
      property.baseValue += bonus;
      property.value += bonus;
    }

    for (const { item } of equippedEntries) {
      for (const { attribute, value } of item.attributes) {
        const current = attributes.get(attribute.name) ?? {
          name: attribute.name,
          description: attribute.description,
          baseValue: 0,
          equipmentBonus: 0,
          value: 0,
        };
        current.equipmentBonus += value;
        current.value += value;
        attributes.set(attribute.name, current);
      }
    }

    for (const attribute of attributes.values()) {
      for (const [propertyName, bonusPerPoint] of Object.entries(
        ATTRIBUTE_EFFECTS[attribute.name as AttributeType].properties,
      )) {
        const property = properties.get(propertyName as StatType);
        if (!property || bonusPerPoint === undefined) continue;
        const bonus = attribute.value * bonusPerPoint;
        const equipmentAttributeBonus = attribute.equipmentBonus * bonusPerPoint;
        property.attributeBonus = (property.attributeBonus ?? 0) + bonus;
        property.equipmentBonus += equipmentAttributeBonus;
        property.value += bonus;
      }
    }

    for (const { item } of equippedEntries) {
      for (const { stat, value } of item.stats) {
        const current = properties.get(stat.name) ?? {
          name: stat.name,
          description: stat.description,
          baseValue: 0,
          attributeBonus: 0,
          equipmentBonus: 0,
          value: 0,
        };
        current.equipmentBonus += value;
        current.value += value;
        properties.set(stat.name, current);
      }
    }

    const activeBuffs = (profile?.buffs ?? []).filter(({ expiresAt }) => expiresAt.getTime() > Date.now());
    for (const buff of activeBuffs) {
      const stat = buff.type === PlayerBuffType.DAMAGE ? StatType.DAMAGE : StatType.DEFENSE;
      if (buff.type === PlayerBuffType.EXPERIENCE) continue;
      const property = properties.get(stat);
      if (!property) continue;
      property.buffBonus = (property.buffBonus ?? 0) + buff.value;
      property.value += buff.value;
    }

    const renderedProperties = [...properties.values()].map((property) => {
      const stat = property.name as StatType;
      if (
        stat !== StatType.CRIT &&
        stat !== StatType.DODGE &&
        stat !== StatType.CRIT_DAMAGE &&
        stat !== StatType.DEFENSE
      )
        return property;

      const rating = property.value;
      const ratingWithoutEquipment = rating - property.equipmentBonus;
      const ratingWithoutEquipmentOrBuff = ratingWithoutEquipment - (property.buffBonus ?? 0);
      const basePercentage = convertRatingToPercentage(stat, property.baseValue, playerLevel);
      const percentageWithoutEquipmentOrBuff = convertRatingToPercentage(
        stat,
        ratingWithoutEquipmentOrBuff,
        playerLevel,
      );
      const percentageWithoutEquipment = convertRatingToPercentage(stat, ratingWithoutEquipment, playerLevel);
      const value = convertRatingToPercentage(stat, rating, playerLevel);

      return {
        ...property,
        rating,
        equipmentRatingBonus: property.equipmentBonus,
        baseValue: basePercentage,
        attributeBonus: Math.round((percentageWithoutEquipmentOrBuff - basePercentage) * 10) / 10,
        equipmentBonus: Math.round((value - percentageWithoutEquipment) * 10) / 10,
        value,
        ...(property.buffBonus
          ? {
              buffRatingBonus: property.buffBonus,
              buffBonus: Math.round((percentageWithoutEquipment - percentageWithoutEquipmentOrBuff) * 10) / 10,
            }
          : {}),
      };
    });

    return {
      ...this.render(user),
      gold: profile?.gold ?? 0,
      gems: profile?.gems ?? 0,
      experience: profile?.experience ?? 0,
      experienceToNextLevel: experienceToNextLevel(playerLevel),
      maxLevel: MAX_PLAYER_LEVEL,
      devGemPurchasesEnabled:
        process.env.NODE_ENV !== 'production' &&
        (process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'start:dev'),
      currentShopId: profile ? (townAt(profile)?.shopId ?? null) : null,
      dungeonCooldowns: (profile?.dungeonVisits ?? []).map(({ dungeon, nextEntryAt }) => ({ dungeon, nextEntryAt })),
      level: playerLevel,
      freeAttributes: profile?.freeAttributes ?? 0,
      mapPosition: {
        x: profile?.mapPositionX ?? 1470,
        y: profile?.mapPositionY ?? 1040,
      },
      activeBuffs: activeBuffs.map(({ type, value, expiresAt }) => ({ type, value, expiresAt })),
      attributes: [...attributes.values()],
      properties: renderedProperties,
      inventory: entries.filter((entry) => !entry.isEquiped).map(renderEntry),
      equippedItems: equippedEntries.map(renderEntry),
    };
  }

  static render(user: UserModel, view: UserViewType = 'default'): Partial<UserModel> {
    // 2. Базовые поля, которые отдаются всегда и везде (аналог корневых полей в Blueprinter)
    const base = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 3. Формируем ответ в зависимости от выбранного view
    switch (view) {
      case 'extended':
        // Расширенный вид (например, для админки или личного кабинета)
        // Включает в себя всё из default + системную информацию
        return {
          ...this.render(user, 'default'),
        };

      case 'default':
      default:
        return base;
    }
  }

  // 4. Поддерживаем передачу view и для коллекций
  static renderCollection(users: UserModel[], view: UserViewType = 'default') {
    return users.map((user) => this.render(user, view));
  }
}
