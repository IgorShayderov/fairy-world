import {
  PrismaClient,
  Gender,
  ItemRarity,
  EquipmentType,
  AttributeType,
  StatType,
  MonsterRarity,
} from '../generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@gmail.com';
  const hashedPassword = await bcrypt.hash('Qwerty123!', 10);

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

  const channelsNames = ['General', 'Market'];

  for (const channelName of channelsNames) {
    const channel = await prisma.channel.upsert({
      where: { name: channelName },
      update: {},
      create: { name: channelName },
    });
    console.log(`Создан канал: ${channel.name}`);
  }

  const usersData = [
    {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin_God',
      gender: Gender.MALE,
      country: 'Russia',
      city: 'Moscow',
      gameProfile: {
        create: {
          gold: 99999,
          experience: 150000,
          level: 100,
        },
      },
    },
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

  const itemsData = [
    {
      name: 'Wooden Sword',
      description: 'Простой деревянный меч для тренировок.',
      price: 10,
      icon: 'icon_wooden_sword.png',
      rarity: ItemRarity.COMMON,
      equipmentType: [EquipmentType.WEAPON],
      stats: {
        create: [{ stat: { connect: { name: StatType.DAMAGE } }, value: 1 }],
      },
    },
    {
      name: 'Iron Shield',
      description: 'Тяжелый, но надежный железный щит.',
      price: 50,
      icon: 'icon_iron_shield.png',
      rarity: ItemRarity.COMMON,
      equipmentType: [EquipmentType.SHIELD],
      stats: {
        create: [{ stat: { connect: { name: StatType.DEFENSE } }, value: 1 }],
      },
    },
    {
      name: 'Minor Health Potion',
      description: 'Восстанавливает немного здоровья.',
      price: 15,
      icon: 'icon_hp_potion.png',
      rarity: ItemRarity.COMMON,
      equipmentType: [EquipmentType.POTION],
      isConsumable: true,
      // TODO: нужно добавить эффекты
    },
    {
      name: 'Leather Armor',
      description: 'Легкая броня из выделанной кожи.',
      price: 120,
      icon: 'icon_leather_armor.png',
      rarity: ItemRarity.MAGIC,
      equipmentType: [EquipmentType.BODY],
      stats: {
        create: [
          { stat: { connect: { name: StatType.DEFENSE } }, value: 5 },
          { stat: { connect: { name: StatType.DODGE } }, value: 3 },
        ],
      },
    },
    {
      name: 'Ring of Vitality',
      description: 'Кольцо, пульсирующее жизненной энергией.',
      price: 500,
      icon: 'icon_vitality_ring.png',
      rarity: ItemRarity.RARE,
      equipmentType: [EquipmentType.RING],
      stats: {
        create: [
          { stat: { connect: { name: StatType.MANA } }, value: 5 },
          { stat: { connect: { name: StatType.HEALTH } }, value: 10 },
          { stat: { connect: { name: StatType.DEFENSE } }, value: 3 },
        ],
      },
    },
    {
      name: 'Excalibur',
      description: 'Легендарный меч истинного короля.',
      price: 10000,
      icon: 'icon_excalibur.png',
      rarity: ItemRarity.UNIQUE,
      equipmentType: [EquipmentType.WEAPON],
      stats: {
        create: [
          { stat: { connect: { name: StatType.DAMAGE } }, value: 50 },
          { stat: { connect: { name: StatType.CRIT_DAMAGE } }, value: 15 },
          { stat: { connect: { name: StatType.CRIT } }, value: 10 },
        ],
      },
    },
    {
      name: 'Boots of Swiftness',
      description: 'Позволяют владельцу бегать со скоростью ветра.',
      price: 800,
      icon: 'icon_swift_boots.png',
      rarity: ItemRarity.RARE,
      equipmentType: [EquipmentType.BOOTS],
      attributes: {
        create: [{ attribute: { connect: { name: AttributeType.AGILITY } }, value: 10 }],
      },
    },
    {
      name: 'Amulet of the Archmage',
      description: 'Дарует невероятную магическую силу.',
      price: 15000,
      icon: 'icon_archmage_amulet.png',
      rarity: ItemRarity.UNIQUE,
      equipmentType: [EquipmentType.AMULET],
      attributes: {
        create: [{ attribute: { connect: { name: AttributeType.WISDOM } }, value: 10 }],
      },
      stats: {
        create: [{ stat: { connect: { name: StatType.MANA } }, value: 15 }],
      },
    },
    {
      name: 'Town Portal Scroll',
      description: 'Свиток, открывающий портал в ближайший город.',
      price: 100,
      icon: 'icon_tp_scroll.png',
      rarity: ItemRarity.QUEST,
      equipmentType: [EquipmentType.SCROLL],
      consumable: true,
      // добавить эффект
    },
    {
      name: 'Dragon Scale Helmet',
      description: 'Шлем, выкованный из чешуи древнего дракона.',
      price: 3500,
      icon: 'icon_dragon_helm.png',
      rarity: ItemRarity.RARE,
      equipmentType: [EquipmentType.HELMET],
      stats: {
        create: [
          { stat: { connect: { name: StatType.DEFENSE } }, value: 50 },
          { stat: { connect: { name: StatType.DODGE } }, value: 15 },
        ],
      },
    },
  ];

  for (const itemData of itemsData) {
    const item = await prisma.item.create({ data: itemData });
    console.log(`Создан предмет: ${item.name} (${item.rarity})`);
  }

  const monstersData = [
    {
      name: 'Goblin',
      description: 'Маленький, но назойливый зеленый существ.',
      rarity: MonsterRarity.COMMON,
      level: 1,
      health: 10,
      attack: 3,
      defense: 1,
      rewardGold: 5,
      rewardExperience: 10,
    },
    {
      name: 'Forest Wolf',
      description: 'Быстрая и опасная стая хищников.',
      rarity: MonsterRarity.COMMON,
      level: 2,
      health: 15,
      attack: 5,
      defense: 2,
      rewardGold: 8,
      rewardExperience: 15,
    },
    {
      name: 'Skeleton',
      description: 'Передвижные останки, одетые в доспехи.',
      rarity: MonsterRarity.UNCOMMON,
      level: 3,
      health: 20,
      attack: 6,
      defense: 3,
      rewardGold: 12,
      rewardExperience: 20,
    },
    {
      name: 'Bandit',
      description: 'Разбойник, охотящийся на путника.',
      rarity: MonsterRarity.UNCOMMON,
      level: 4,
      health: 25,
      attack: 8,
      defense: 4,
      rewardGold: 18,
      rewardExperience: 30,
    },
    {
      name: 'Vampire Bat',
      description: 'Кровососущее летающее существо.',
      rarity: MonsterRarity.UNCOMMON,
      level: 5,
      health: 18,
      attack: 9,
      defense: 3,
      rewardGold: 25,
      rewardExperience: 35,
    },
    {
      name: 'Ancient Spider',
      description: 'Огромный паук с ядовитой чешуей.',
      rarity: MonsterRarity.RARE,
      level: 6,
      health: 30,
      attack: 12,
      defense: 5,
      rewardGold: 35,
      rewardExperience: 50,
    },
    {
      name: 'Orc Warrior',
      description: 'Сила и свирепость в доспехах.',
      rarity: MonsterRarity.RARE,
      level: 8,
      health: 45,
      attack: 15,
      defense: 8,
      rewardGold: 50,
      rewardExperience: 70,
    },
    {
      name: 'Dark Mage',
      description: 'Колдунья, полный темной магии.',
      rarity: MonsterRarity.RARE,
      level: 9,
      health: 35,
      attack: 18,
      defense: 6,
      rewardGold: 60,
      rewardExperience: 85,
    },
    {
      name: 'Stone Golem',
      description: 'Живой каменный страж.',
      rarity: MonsterRarity.ELITE,
      level: 12,
      health: 80,
      attack: 20,
      defense: 15,
      rewardGold: 120,
      rewardExperience: 150,
    },
    {
      name: 'Ancient Dragon',
      description: 'Древний дракон, хранитель сокровищ.',
      rarity: MonsterRarity.BOSS,
      level: 20,
      health: 200,
      attack: 35,
      defense: 20,
      rewardGold: 500,
      rewardExperience: 500,
    },
  ];

  for (const monsterData of monstersData) {
    const monster = await prisma.monster.create({ data: monsterData });
    console.log(`Создан монстр: ${monster.name} (level ${monster.level}, ${monster.rarity})`);
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
