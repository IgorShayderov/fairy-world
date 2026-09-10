import { UserModel } from '../../generated/models';
import { AttributeType, StatType, type Prisma } from '../../generated/client';
import { ItemView } from '../common/views/item.view';

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
      };
    };
  };
}>;

type EffectiveModifier = {
  name: string;
  description: string | null;
  baseValue: number;
  equipmentBonus: number;
  value: number;
};

// 1. Задаем строгий тип для возможных вариантов view.
// Это даст идеальный автокомплит при вызове метода.
export type UserViewType = 'default' | 'extended';

export class UserView {
  static renderCurrent(user: CurrentUserModel) {
    const profile = user.gameProfile;
    const entries = profile?.inventory ?? [];
    const equippedEntries = entries.filter((entry) => entry.isEquiped);
    const renderEntry = (entry: (typeof entries)[number]) => ({
      ...entry,
      item: ItemView.render(entry.item),
    });

    const attributes = new Map<AttributeType, EffectiveModifier>(
      Object.values(AttributeType).map((name) => [
        name,
        { name, description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
      ]),
    );
    const properties = new Map<StatType, EffectiveModifier>(
      Object.values(StatType).map((name) => [
        name,
        { name, description: null, baseValue: 0, equipmentBonus: 0, value: 0 },
      ]),
    );

    for (const { attribute, value } of profile?.profileAttributes ?? []) {
      attributes.set(attribute.name, {
        name: attribute.name,
        description: attribute.description,
        baseValue: value,
        equipmentBonus: 0,
        value,
      });
    }
    for (const { stat, value } of profile?.profileStats ?? []) {
      properties.set(stat.name, {
        name: stat.name,
        description: stat.description,
        baseValue: value,
        equipmentBonus: 0,
        value,
      });
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
      for (const { stat, value } of item.stats) {
        const current = properties.get(stat.name) ?? {
          name: stat.name,
          description: stat.description,
          baseValue: 0,
          equipmentBonus: 0,
          value: 0,
        };
        current.equipmentBonus += value;
        current.value += value;
        properties.set(stat.name, current);
      }
    }

    return {
      ...this.render(user),
      gold: profile?.gold ?? 0,
      experience: profile?.experience ?? 0,
      level: profile?.level ?? 1,
      attributes: [...attributes.values()],
      properties: [...properties.values()],
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
