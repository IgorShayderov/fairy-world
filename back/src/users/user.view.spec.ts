import type { Prisma } from '../../generated/client';
import { UserView } from './user.view';

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

describe('UserView.renderCurrent', () => {
  it('separates equipment and applies item modifiers to player values', () => {
    const commonItem = {
      description: 'A reliable shield',
      price: 50,
      icon: 'shield.png',
      isConsumable: false,
      rarity: 'COMMON' as const,
      equipmentType: ['SHIELD' as const],
      level: 1,
      createdAt: new Date('2026-09-10T00:00:00Z'),
      updatedAt: new Date('2026-09-10T00:00:00Z'),
    };
    const user = {
      id: 1,
      email: 'hero@example.com',
      password: 'secret',
      name: 'Hero',
      gender: null,
      country: null,
      city: null,
      language: null,
      role: 'USER' as const,
      hashedRefreshToken: null,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date('2026-09-10T00:00:00Z'),
      updatedAt: new Date('2026-09-10T00:00:00Z'),
      gameProfile: {
        id: 7,
        userId: 1,
        gold: 100,
        experience: 20,
        level: 3,
        freeAttributes: 0,
        profileAttributes: [
          {
            gameProfileId: 7,
            attributeId: 1,
            value: 2,
            attribute: { id: 1, name: 'STRENGTH' as const, description: 'Physical power' },
          },
        ],
        profileStats: [
          {
            gameProfileId: 7,
            statId: 1,
            value: 5,
            stat: { id: 1, name: 'DEFENSE' as const, description: 'Damage reduction' },
          },
        ],
        inventory: [
          {
            id: 10,
            gameProfileId: 7,
            itemId: 2,
            quantity: 1,
            slot: 'right-hand',
            isEquiped: true,
            createdAt: new Date('2026-09-10T00:00:00Z'),
            updatedAt: new Date('2026-09-10T00:00:00Z'),
            item: {
              id: 2,
              name: 'Iron Shield',
              ...commonItem,
              attributes: [
                {
                  itemId: 2,
                  attributeId: 1,
                  value: 1,
                  attribute: { id: 1, name: 'STRENGTH' as const, description: 'Physical power' },
                },
              ],
              stats: [
                {
                  itemId: 2,
                  statId: 1,
                  value: 3,
                  stat: { id: 1, name: 'DEFENSE' as const, description: 'Damage reduction' },
                },
              ],
            },
          },
          {
            id: 11,
            gameProfileId: 7,
            itemId: 3,
            quantity: 2,
            slot: null,
            isEquiped: false,
            createdAt: new Date('2026-09-10T00:00:00Z'),
            updatedAt: new Date('2026-09-10T00:00:00Z'),
            item: {
              id: 3,
              name: 'Spare Shield',
              ...commonItem,
              attributes: [],
              stats: [],
            },
          },
        ],
      },
    } satisfies CurrentUserModel;

    const result = UserView.renderCurrent(user);

    expect(result.inventory).toHaveLength(1);
    expect(result.equippedItems).toHaveLength(1);
    expect(result.equippedItems[0]).toMatchObject({
      id: 10,
      slot: 'right-hand',
      item: {
        name: 'Iron Shield',
        attributes: [{ name: 'STRENGTH', description: 'Physical power', value: 1 }],
        properties: [{ name: 'DEFENSE', description: 'Damage reduction', value: 3 }],
      },
    });
    expect(result.attributes).toHaveLength(5);
    expect(result.attributes).toContainEqual({
      name: 'STRENGTH',
      description: 'Increases Damage by 1 per point.',
      baseValue: 2,
      equipmentBonus: 1,
      value: 3,
    });
    expect(result.properties).toHaveLength(7);
    expect(result.properties).toContainEqual({
      name: 'DEFENSE',
      description: 'Damage reduction',
      baseValue: 5,
      attributeBonus: 5,
      equipmentBonus: 3,
      value: 13,
    });
  });
});
