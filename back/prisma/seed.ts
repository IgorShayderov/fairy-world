import { PrismaClient, Gender, EquipmentType, AttributeType, StatType, UserRole } from '../generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { SEEDED_CONSUMABLES } from '../src/items/seeded-consumables';
import { STARTING_ATTRIBUTE_VALUE, STARTING_PROPERTIES } from '../src/users/player-defaults';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@gmail.com';
  const hashedPassword = await bcrypt.hash('Qwerty123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin_God',
      gender: Gender.MALE,
      country: 'Russia',
      role: UserRole.ADMIN,
      city: 'Moscow',
      gameProfile: {
        create: {
          gold: 99999,
          experience: 150000,
          level: 100,
        },
      },
    },
    include: { gameProfile: true },
  });

  const usersData = [
    {
      email: 'alice@example.com',
      password: hashedPassword,
      name: 'Alice_Hero',
      gender: Gender.FEMALE,
      language: 'en',
      gameProfile: {
        create: {
          gold: 1500,
          experience: 2500,
          level: 10,
        },
      },
    },
    {
      email: 'newbie@example.com',
      password: hashedPassword,
      name: 'NoobMaster',
      gameProfile: {
        create: {},
      },
    },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });

    console.log(`Создан пользователь: ${user.name}`);
  }

  for (const attributeType of Object.values(AttributeType)) {
    // TODO: добавить description
    const attribute = await prisma.attribute.upsert({
      where: { name: attributeType },
      update: {},
      create: {
        name: attributeType,
      },
    });

    console.log(`Создан атрибут: ${attribute.name}`);
  }

  for (const statType of Object.values(StatType)) {
    // TODO: добавить description
    const stat = await prisma.stat.upsert({
      where: { name: statType },
      update: {},
      create: {
        name: statType,
      },
    });

    console.log(`Создан стат: ${stat.name}`);
  }

  const [gameProfiles, attributes, stats] = await Promise.all([
    prisma.gameProfile.findMany({ select: { id: true } }),
    prisma.attribute.findMany({ select: { id: true, name: true } }),
    prisma.stat.findMany({ select: { id: true, name: true } }),
  ]);

  for (const profile of gameProfiles) {
    for (const attribute of attributes) {
      await prisma.profileAttribute.upsert({
        where: { gameProfileId_attributeId: { gameProfileId: profile.id, attributeId: attribute.id } },
        update: {},
        create: {
          gameProfileId: profile.id,
          attributeId: attribute.id,
          value: STARTING_ATTRIBUTE_VALUE,
        },
      });
    }
    for (const stat of stats) {
      await prisma.profileStat.upsert({
        where: { gameProfileId_statId: { gameProfileId: profile.id, statId: stat.id } },
        update: {},
        create: {
          gameProfileId: profile.id,
          statId: stat.id,
          value: STARTING_PROPERTIES[stat.name],
        },
      });
    }
  }

  const channelsNames = ['General', 'Market'];

  for (const channelName of channelsNames) {
    const channel = await prisma.channel.upsert({
      where: { name: channelName },
      update: {},
      create: { name: channelName },
    });
    console.log(`Создан канал: ${channel.name}`);
  }

  await prisma.shop.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'General Store', gold: 1000 },
  });

  for (const consumable of SEEDED_CONSUMABLES) {
    const data = {
      name: consumable.name,
      description: consumable.description,
      price: consumable.price,
      icon: consumable.equipmentType === EquipmentType.POTION ? 'icon_potion.png' : 'icon_scroll.png',
      isConsumable: true,
      rarity: consumable.rarity,
      equipmentType: [consumable.equipmentType],
      level: 1,
    };
    const existingItem = await prisma.item.findFirst({ where: { name: consumable.name } });
    const item = existingItem
      ? await prisma.item.update({ where: { id: existingItem.id }, data })
      : await prisma.item.create({ data });

    console.log(`Создан расходуемый предмет: ${item.name}`);
  }

  const monstersData = [
    {
      name: 'Goblin',
      description: 'Маленький, но назойливый зеленый существ.',
      level: 1,
      rewardGold: 5,
      rewardExperience: 10,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.STRENGTH } }, value: 1 },
          { attribute: { connect: { name: AttributeType.AGILITY } }, value: 1 },
        ],
      },
    },
    {
      name: 'Forest Wolf',
      description: 'Быстрая и опасная стая хищников.',
      level: 2,
      rewardGold: 8,
      rewardExperience: 15,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.AGILITY } }, value: 1 },
          { attribute: { connect: { name: AttributeType.ENDURANCE } }, value: 1 },
        ],
      },
    },
    {
      name: 'Skeleton',
      description: 'Передвижные останки, одетые в доспехи.',
      level: 3,
      rewardGold: 12,
      rewardExperience: 20,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.STRENGTH } }, value: 1 },
          { attribute: { connect: { name: AttributeType.ENDURANCE } }, value: 1 },
        ],
      },
    },
    {
      name: 'Bandit',
      description: 'Разбойник, охотящийся на путника.',
      level: 4,
      rewardGold: 18,
      rewardExperience: 30,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.STRENGTH } }, value: 1 },
          { attribute: { connect: { name: AttributeType.AGILITY } }, value: 1 },
        ],
      },
    },
    {
      name: 'Vampire Bat',
      description: 'Кровососущее летающее существо.',
      level: 5,
      rewardGold: 25,
      rewardExperience: 35,
      attributes: {
        create: [{ attribute: { connect: { name: AttributeType.AGILITY } }, value: 1 }],
      },
    },
    {
      name: 'Ancient Spider',
      description: 'Огромный паук с ядовитой чешуей.',
      level: 6,
      rewardGold: 35,
      rewardExperience: 50,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.AGILITY } }, value: 1 },
          { attribute: { connect: { name: AttributeType.ENDURANCE } }, value: 1 },
        ],
      },
    },
    {
      name: 'Orc Warrior',
      description: 'Сила и свирепость в доспехах.',
      level: 8,
      rewardGold: 50,
      rewardExperience: 70,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.STRENGTH } }, value: 1 },
          { attribute: { connect: { name: AttributeType.ENDURANCE } }, value: 1 },
        ],
      },
    },
    {
      name: 'Dark Mage',
      description: 'Колдунья, полный темной магии.',
      level: 9,
      rewardGold: 60,
      rewardExperience: 85,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.WISDOM } }, value: 1 },
          { attribute: { connect: { name: AttributeType.ENDURANCE } }, value: 1 },
        ],
      },
    },
    {
      name: 'Stone Golem',
      description: 'Живой каменный страж.',
      level: 12,
      rewardGold: 120,
      rewardExperience: 150,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.STRENGTH } }, value: 1 },
          { attribute: { connect: { name: AttributeType.AGILITY } }, value: 1 },
          { attribute: { connect: { name: AttributeType.ENDURANCE } }, value: 1 },
          { attribute: { connect: { name: AttributeType.WISDOM } }, value: 1 },
          { attribute: { connect: { name: AttributeType.CHARISMA } }, value: 1 },
        ],
      },
    },
    {
      name: 'Ancient Dragon',
      description: 'Древний дракон, хранитель сокровищ.',
      level: 20,
      rewardGold: 500,
      rewardExperience: 500,
      attributes: {
        create: [
          { attribute: { connect: { name: AttributeType.STRENGTH } }, value: 5 },
          { attribute: { connect: { name: AttributeType.ENDURANCE } }, value: 5 },
          { attribute: { connect: { name: AttributeType.WISDOM } }, value: 4 },
          { attribute: { connect: { name: AttributeType.CHARISMA } }, value: 4 },
        ],
      },
    },
  ];

  for (const monsterData of monstersData) {
    const existingMonster = await prisma.monster.findUnique({ where: { name: monsterData.name } });
    if (existingMonster) continue;

    const monster = await prisma.monster.create({ data: monsterData });
    console.log(`Создан монстр: ${monster.name} (level ${monster.level})`);
  }

  // Добавление предметов пользователю
  const sword = await prisma.item.findFirst({ where: { name: 'Wooden Sword' } });
  const potion = await prisma.item.findFirst({ where: { name: 'Lesser Health Potion' } });

  if (adminUser?.gameProfile && sword && potion) {
    const inventoryItems = [
      { itemId: sword.id, quantity: 1, slot: 'left-hand', isEquiped: true },
      { itemId: potion.id, quantity: 5, slot: null, isEquiped: false },
    ];

    for (const invItem of inventoryItems) {
      const existingInventoryItem = await prisma.inventoryItem.findFirst({
        where: { gameProfileId: adminUser.gameProfile.id, itemId: invItem.itemId },
      });

      if (existingInventoryItem) {
        await prisma.inventoryItem.update({
          where: { id: existingInventoryItem.id },
          data: {
            quantity: invItem.quantity,
            slot: invItem.slot,
            isEquiped: invItem.isEquiped,
          },
        });
      } else {
        const occupiedSlot = invItem.slot
          ? await prisma.inventoryItem.findFirst({
              where: { gameProfileId: adminUser.gameProfile.id, slot: invItem.slot },
            })
          : null;
        if (occupiedSlot) continue;

        await prisma.inventoryItem.create({
          data: {
            gameProfileId: adminUser.gameProfile.id,
            itemId: invItem.itemId,
            quantity: invItem.quantity,
            slot: invItem.slot,
            isEquiped: invItem.isEquiped,
          },
        });
      }
    }
  }

  console.log('Сиды успешно выполнены');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
