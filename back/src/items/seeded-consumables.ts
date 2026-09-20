import { EquipmentType, ItemRarity } from '../../generated/client';

export const SEEDED_CONSUMABLES = [
  // Tier 1 (Level 10+)
  {
    name: 'Lesser Experience Potion',
    description: 'Increases experience gained by 10% for 4 hours.',
    price: 50,
    rarity: ItemRarity.COMMON,
    equipmentType: EquipmentType.POTION,
    level: 10,
  },
  {
    name: 'Lesser Attack Potion',
    description: 'Increases Damage by 5 for 4 hours.',
    price: 40,
    rarity: ItemRarity.COMMON,
    equipmentType: EquipmentType.POTION,
    level: 10,
  },
  {
    name: 'Lesser Defense Potion',
    description: 'Increases Defense by 5 for 4 hours, blocking 5 additional damage per hit.',
    price: 40,
    rarity: ItemRarity.COMMON,
    equipmentType: EquipmentType.POTION,
    level: 10,
  },

  // Tier 2 (Level 20+)
  {
    name: 'Medium Experience Potion',
    description: 'Increases experience gained by 20% for 4 hours.',
    price: 120,
    rarity: ItemRarity.MAGIC,
    equipmentType: EquipmentType.POTION,
    level: 20,
  },
  {
    name: 'Medium Attack Potion',
    description: 'Increases Damage by 10 for 4 hours.',
    price: 90,
    rarity: ItemRarity.MAGIC,
    equipmentType: EquipmentType.POTION,
    level: 20,
  },
  {
    name: 'Medium Defense Potion',
    description: 'Increases Defense by 10 for 4 hours, blocking 10 additional damage per hit.',
    price: 90,
    rarity: ItemRarity.MAGIC,
    equipmentType: EquipmentType.POTION,
    level: 20,
  },

  // Tier 3 (Level 30+)
  {
    name: 'Mild Experience Potion',
    description: 'Increases experience gained by 30% for 4 hours.',
    price: 250,
    rarity: ItemRarity.MAGIC,
    equipmentType: EquipmentType.POTION,
    level: 30,
  },
  {
    name: 'Mild Attack Potion',
    description: 'Increases Damage by 20 for 4 hours.',
    price: 180,
    rarity: ItemRarity.MAGIC,
    equipmentType: EquipmentType.POTION,
    level: 30,
  },
  {
    name: 'Mild Defense Potion',
    description: 'Increases Defense by 20 for 4 hours, blocking 20 additional damage per hit.',
    price: 180,
    rarity: ItemRarity.MAGIC,
    equipmentType: EquipmentType.POTION,
    level: 30,
  },
  {
    name: 'Free Attribute Potion',
    description: 'Grants 1 free attribute point when consumed.',
    price: 1000,
    rarity: ItemRarity.UNIQUE,
    equipmentType: EquipmentType.POTION,
    level: 30,
  },

  // Tier 4 (Level 40+)
  {
    name: 'Greater Experience Potion',
    description: 'Increases experience gained by 40% for 4 hours.',
    price: 450,
    rarity: ItemRarity.RARE,
    equipmentType: EquipmentType.POTION,
    level: 40,
  },
  {
    name: 'Greater Attack Potion',
    description: 'Increases Damage by 30 for 4 hours.',
    price: 300,
    rarity: ItemRarity.RARE,
    equipmentType: EquipmentType.POTION,
    level: 40,
  },
  {
    name: 'Greater Defense Potion',
    description: 'Increases Defense by 30 for 4 hours, blocking 30 additional damage per hit.',
    price: 300,
    rarity: ItemRarity.RARE,
    equipmentType: EquipmentType.POTION,
    level: 40,
  },

  // Tier 5 (Level 50+)
  {
    name: 'Higher Experience Potion',
    description: 'Increases experience gained by 50% for 4 hours.',
    price: 800,
    rarity: ItemRarity.RARE,
    equipmentType: EquipmentType.POTION,
    level: 50,
  },
  {
    name: 'Higher Attack Potion',
    description: 'Increases Damage by 50 for 4 hours.',
    price: 500,
    rarity: ItemRarity.RARE,
    equipmentType: EquipmentType.POTION,
    level: 50,
  },
  {
    name: 'Higher Defense Potion',
    description: 'Increases Defense by 50 for 4 hours, blocking 50 additional damage per hit.',
    price: 500,
    rarity: ItemRarity.RARE,
    equipmentType: EquipmentType.POTION,
    level: 50,
  },
] as const;
