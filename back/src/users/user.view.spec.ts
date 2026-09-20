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
        buffs: true;
        dungeonVisits: true;
        sanctuaryVisits: true;
        craftItems: { include: { craftItem: true } };
        _count: { select: { quests: { where: { completedAt: { not: null } } } } };
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
        gems: 25,
        experience: 20,
        level: 3,
        freeAttributes: 0,
        mapPositionX: 1600,
        mapPositionY: 900,
        buffs: [],
        dungeonVisits: [],
        killedMonsters: 42,
        _count: { quests: 3 },
        sanctuaryVisits: [{ gameProfileId: 7, sanctuaryId: 1, nextBlessingAt: new Date('2099-01-01T00:00:00Z') }],
        craftItems: [],
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
            upgradeType: null,
            upgradeValue: null,
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
                {
                  itemId: 2,
                  statId: 2,
                  value: 4,
                  stat: { id: 2, name: 'DAMAGE' as const, description: 'Weapon damage' },
                },
                {
                  itemId: 2,
                  statId: 3,
                  value: 4,
                  stat: { id: 3, name: 'CRIT' as const, description: 'Critical rating' },
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
            upgradeType: null,
            upgradeValue: null,
            createdAt: new Date('2026-09-10T00:00:00Z'),
            updatedAt: new Date('2026-09-10T00:00:00Z'),
            item: {
              id: 3,
              ...commonItem,
              name: 'Vitality Crystal',
              icon: 'craft_health_crystal.png',
              attributes: [],
              stats: [],
            },
          },
        ],
      },
    } satisfies CurrentUserModel;

    const result = UserView.renderCurrent(user);
    expect(result.killedMonsters).toBe(42);
    expect(result.accomplishedQuests).toBe(3);
    expect(result.sanctuaryCooldowns).toEqual([{ sanctuaryId: 1, nextBlessingAt: new Date('2099-01-01T00:00:00Z') }]);

    expect(result.gems).toBe(25);
    expect(result.mapPosition).toEqual({ x: 1600, y: 900 });
    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]).toMatchObject({
      craftUpgradeType: 'HEALTH',
      craftUpgradeValue: 10,
    });
    expect(result.equippedItems).toHaveLength(1);
    expect(result.equippedItems[0]).toMatchObject({
      id: 10,
      slot: 'right-hand',
      item: {
        name: 'Iron Shield',
        attributes: [{ name: 'STRENGTH', description: 'Physical power', value: 1 }],
        properties: [
          { name: 'DEFENSE', description: 'Damage reduction', value: 3 },
          { name: 'DAMAGE', description: 'Weapon damage', value: 4 },
          { name: 'CRIT', description: 'Critical rating', value: 4 },
        ],
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
      name: 'DAMAGE',
      description: 'Base damage dealt by attacks.',
      baseValue: 1,
      attributeBonus: 3,
      equipmentBonus: 5,
      value: 8,
    });
    expect(result.properties).toContainEqual({
      name: 'DEFENSE',
      description: 'Damage reduction',
      baseValue: 6.7,
      attributeBonus: 5.8,
      equipmentBonus: 3.2,
      value: 15.7,
      rating: 13,
      equipmentRatingBonus: 3,
    });
    expect(result.properties).toContainEqual({
      name: 'CRIT',
      description: 'Final critical-hit chance, capped at 50%.',
      baseValue: 0,
      attributeBonus: 4.6,
      equipmentBonus: 7.5,
      value: 12.1,
      rating: 6.5,
      equipmentRatingBonus: 4,
    });
  });

  it('applies active stat buffs and ignores expired buffs', () => {
    const user = {
      id: 1,
      name: 'Hero',
      email: 'hero@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      gameProfile: {
        gold: 0,
        gems: 0,
        experience: 0,
        level: 1,
        freeAttributes: 0,
        mapPositionX: 1470,
        mapPositionY: 1040,
        inventory: [],
        profileAttributes: [],
        profileStats: [],
        buffs: [
          { type: 'DAMAGE', value: 15, expiresAt: new Date(Date.now() + 60_000) },
          { type: 'DEFENSE', value: 50, expiresAt: new Date(Date.now() - 60_000) },
        ],
      },
    } as unknown as Parameters<typeof UserView.renderCurrent>[0];

    const result = UserView.renderCurrent(user);

    expect(result.activeBuffs).toEqual([expect.objectContaining({ type: 'DAMAGE', value: 15 })]);
    expect(result.properties).toContainEqual(expect.objectContaining({ name: 'DAMAGE', value: 21, buffBonus: 15 }));
    expect(result.properties.find(({ name }) => name === 'DEFENSE')).not.toHaveProperty('buffBonus');
  });

  it('caps defense at fifty percent even with an active defense blessing', () => {
    const user = {
      id: 1,
      name: 'Tank',
      email: 'tank@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      gameProfile: {
        gold: 0,
        gems: 0,
        experience: 0,
        level: 20,
        freeAttributes: 0,
        mapPositionX: 1470,
        mapPositionY: 1040,
        inventory: [],
        profileAttributes: [],
        profileStats: [{ value: 1000, stat: { name: 'DEFENSE', description: 'Defense' } }],
        buffs: [{ type: 'DEFENSE', value: 1000, expiresAt: new Date(Date.now() + 60_000) }],
      },
    } as unknown as Parameters<typeof UserView.renderCurrent>[0];
    const defense = UserView.renderCurrent(user).properties.find(({ name }) => name === 'DEFENSE');
    expect(defense?.value).toBe(50);
  });
});
