import { CraftItemKind, CraftUpgradeType, ItemRarity } from '../../generated/client';

export const CRAFT_MATERIAL_DROP_CHANCE = 0.35;

export const CRAFT_ITEMS = [
  {
    code: 'IRON_ORE',
    name: 'Iron Ore',
    description: 'Dense ore used for weapon and armor upgrades.',
    icon: 'craft_iron_ore.png',
    rarity: ItemRarity.COMMON,
    kind: CraftItemKind.MATERIAL,
    upgradeType: null,
  },
  {
    code: 'ARCANE_DUST',
    name: 'Arcane Dust',
    description: 'Shimmering residue that binds magical effects.',
    icon: 'craft_arcane_dust.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.MATERIAL,
    upgradeType: null,
  },
  {
    code: 'BEAST_HIDE',
    name: 'Beast Hide',
    description: 'Tough hide taken from monsters of the wild.',
    icon: 'craft_beast_hide.png',
    rarity: ItemRarity.COMMON,
    kind: CraftItemKind.MATERIAL,
    upgradeType: null,
  },
  {
    code: 'ANCIENT_COIN',
    name: 'Ancient Coin',
    description: 'A lucky coin carrying traces of forgotten wealth.',
    icon: 'craft_ancient_coin.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.MATERIAL,
    upgradeType: null,
  },
  {
    code: 'VERDANT_ESSENCE',
    name: 'Verdant Essence',
    description: 'Condensed living energy used in restorative crafts.',
    icon: 'craft_verdant_essence.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.MATERIAL,
    upgradeType: null,
  },
  {
    code: 'EMBER_CRYSTAL',
    name: 'Ember Crystal',
    description: 'A hot mineral fragment that strengthens damaging crafts.',
    icon: 'craft_ember_crystal.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.MATERIAL,
    upgradeType: null,
  },
  {
    code: 'DAMAGE_MILLSTONE',
    name: 'Runed Millstone',
    description: 'Drag onto an inventory item to apply a permanent Damage upgrade.',
    icon: 'craft_damage_millstone.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.UPGRADE,
    upgradeType: CraftUpgradeType.DAMAGE,
  },
  {
    code: 'DEFENSE_PLATE',
    name: 'Warding Plate',
    description: 'Drag onto an inventory item to apply a permanent Defense upgrade.',
    icon: 'craft_defense_plate.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.UPGRADE,
    upgradeType: CraftUpgradeType.DEFENSE,
  },
  {
    code: 'GOLD_SIGIL',
    name: 'Gilded Sigil',
    description: 'Drag onto an inventory item to add a permanent equipped-item bonus to gold rewards.',
    icon: 'craft_gold_sigil.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.UPGRADE,
    upgradeType: CraftUpgradeType.GOLD,
  },
  {
    code: 'EXPERIENCE_RUNE',
    name: "Scholar's Rune",
    description: 'Drag onto an inventory item to add a permanent equipped-item bonus to experience rewards.',
    icon: 'craft_experience_rune.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.UPGRADE,
    upgradeType: CraftUpgradeType.EXPERIENCE,
  },
  {
    code: 'HEALTH_CRYSTAL',
    name: 'Vitality Crystal',
    description: 'Drag onto an inventory item to apply a permanent Health upgrade.',
    icon: 'craft_health_crystal.png',
    rarity: ItemRarity.MAGIC,
    kind: CraftItemKind.UPGRADE,
    upgradeType: CraftUpgradeType.HEALTH,
  },
] as const;

export const CRAFT_RECIPES = [
  {
    code: 'RECIPE_DAMAGE_MILLSTONE',
    name: 'Recipe: Runed Millstone',
    description: 'Use this recipe from your inventory to learn how to craft a Runed Millstone.',
    price: 350,
    resultCode: 'DAMAGE_MILLSTONE',
    ingredients: [
      { code: 'IRON_ORE', quantity: 3 },
      { code: 'EMBER_CRYSTAL', quantity: 1 },
    ],
  },
  {
    code: 'RECIPE_DEFENSE_PLATE',
    name: 'Recipe: Warding Plate',
    description: 'Use this recipe from your inventory to learn how to craft a Warding Plate.',
    price: 350,
    resultCode: 'DEFENSE_PLATE',
    ingredients: [
      { code: 'BEAST_HIDE', quantity: 2 },
      { code: 'IRON_ORE', quantity: 2 },
    ],
  },
  {
    code: 'RECIPE_GOLD_SIGIL',
    name: 'Recipe: Gilded Sigil',
    description: 'Use this recipe from your inventory to learn how to craft a Gilded Sigil.',
    price: 500,
    resultCode: 'GOLD_SIGIL',
    ingredients: [
      { code: 'ANCIENT_COIN', quantity: 3 },
      { code: 'ARCANE_DUST', quantity: 1 },
    ],
  },
  {
    code: 'RECIPE_EXPERIENCE_RUNE',
    name: "Recipe: Scholar's Rune",
    description: "Use this recipe from your inventory to learn how to craft a Scholar's Rune.",
    price: 500,
    resultCode: 'EXPERIENCE_RUNE',
    ingredients: [
      { code: 'ARCANE_DUST', quantity: 3 },
      { code: 'VERDANT_ESSENCE', quantity: 1 },
    ],
  },
  {
    code: 'RECIPE_HEALTH_CRYSTAL',
    name: 'Recipe: Vitality Crystal',
    description: 'Use this recipe from your inventory to learn how to craft a Vitality Crystal.',
    price: 400,
    resultCode: 'HEALTH_CRYSTAL',
    ingredients: [
      { code: 'BEAST_HIDE', quantity: 2 },
      { code: 'VERDANT_ESSENCE', quantity: 2 },
    ],
  },
] as const;

// Keep every ordinary material in the drop pool. Rarer materials have fewer entries.
export const CRAFT_MATERIAL_DROP_POOL = [
  'IRON_ORE',
  'IRON_ORE',
  'BEAST_HIDE',
  'BEAST_HIDE',
  'ARCANE_DUST',
  'ANCIENT_COIN',
  'VERDANT_ESSENCE',
  'EMBER_CRYSTAL',
] as const;

export const rollCraftMaterialCode = (random: () => number = Math.random): string | null => {
  if (random() >= CRAFT_MATERIAL_DROP_CHANCE) return null;
  return CRAFT_MATERIAL_DROP_POOL[Math.floor(random() * CRAFT_MATERIAL_DROP_POOL.length)] ?? null;
};

export const upgradeValueForLevel = (type: CraftUpgradeType, level: number): number => {
  const tier = 1 + Math.floor(Math.max(0, level - 5) / 3);
  if (type === CraftUpgradeType.GOLD || type === CraftUpgradeType.EXPERIENCE) return tier * 2;
  if (type === CraftUpgradeType.DEFENSE) return tier * 2;
  if (type === CraftUpgradeType.HEALTH) return tier * 10;
  return tier;
};
