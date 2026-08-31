import { PrismaClient, Gender, ItemRarity, EquipmentType, AttributeType, StatType } from '../generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('Qwerty123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      email: 'admin@gmail.com',
      password: hashedPassword,
      name: 'admin',
      gameProfile: {
        create: {},
      },
    },
  });

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
      email: 'admin@fairyworld.com',
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
    const user = await prisma.user.create({ data: u });
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
      attributes: {
        create: [
          { attribute: StatType.STRENGTH, value: 15 },
          { attribute: StatType.CHARISMA, value: 5 },
        ],
      },
    },
    {
      name: 'Iron Shield',
      description: 'Тяжелый, но надежный железный щит.',
      price: 50,
      icon: 'icon_iron_shield.png',
      rarity: ItemRarity.COMMON,
      equipmentType: [EquipmentType.SHIELD],
    },
    {
      name: 'Minor Health Potion',
      description: 'Восстанавливает немного здоровья.',
      price: 15,
      icon: 'icon_hp_potion.png',
      rarity: ItemRarity.COMMON,
      equipmentType: [EquipmentType.POTION],
      consumable: true,
    },
    {
      name: 'Leather Armor',
      description: 'Легкая броня из выделанной кожи.',
      price: 120,
      icon: 'icon_leather_armor.png',
      rarity: ItemRarity.MAGIC,
      equipmentType: [EquipmentType.BODY],
    },
    {
      name: 'Ring of Vitality',
      description: 'Кольцо, пульсирующее жизненной энергией.',
      price: 500,
      icon: 'icon_vitality_ring.png',
      rarity: ItemRarity.RARE,
      equipmentType: [EquipmentType.RING],
    },
    {
      name: 'Excalibur',
      description: 'Легендарный меч истинного короля.',
      price: 10000,
      icon: 'icon_excalibur.png',
      rarity: ItemRarity.UNIQUE,
      equipmentType: [EquipmentType.WEAPON],
    },
    {
      name: 'Boots of Swiftness',
      description: 'Позволяют владельцу бегать со скоростью ветра.',
      price: 800,
      icon: 'icon_swift_boots.png',
      rarity: ItemRarity.RARE,
      equipmentType: [EquipmentType.BOOTS],
    },
    {
      name: 'Amulet of the Archmage',
      description: 'Дарует невероятную магическую силу.',
      price: 15000,
      icon: 'icon_archmage_amulet.png',
      rarity: ItemRarity.UNIQUE,
      equipmentType: [EquipmentType.AMULET],
    },
    {
      name: 'Town Portal Scroll',
      description: 'Свиток, открывающий портал в ближайший город.',
      price: 100,
      icon: 'icon_tp_scroll.png',
      rarity: ItemRarity.QUEST,
      equipmentType: [EquipmentType.SCROLL],
      consumable: true,
    },
    {
      name: 'Dragon Scale Helmet',
      description: 'Шлем, выкованный из чешуи древнего дракона.',
      price: 3500,
      icon: 'icon_dragon_helm.png',
      rarity: ItemRarity.RARE,
      equipmentType: [EquipmentType.HELMET],
    },
  ];

  for (const i of itemsData) {
    const item = await prisma.item.create({ data: i });
    console.log(`Создан предмет: ${item.name} (${item.rarity})`);
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
