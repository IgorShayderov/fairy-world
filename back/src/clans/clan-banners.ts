export const CLAN_BANNERS = [
  {
    code: 'IRON_OATH',
    name: 'Iron Oath',
    description: 'A battle-worn standard for clans taking their first victories.',
    cost: 120,
    icon: 'shield',
    colors: ['#812f39', '#321b28', '#efca72'],
  },
  {
    code: 'VERDANT_HART',
    name: 'Verdant Hart',
    description: 'The green hart marks hunters who thrive beyond the roads.',
    cost: 300,
    icon: 'forest',
    colors: ['#28624f', '#102f31', '#a9df9a'],
  },
  {
    code: 'MOONWATCH',
    name: 'Moonwatch',
    description: 'A silver sigil for companions who keep watch through the night.',
    cost: 600,
    icon: 'dark_mode',
    colors: ['#3e4f82', '#171f3b', '#c9d9ff'],
  },
  {
    code: 'FROSTBOUND',
    name: 'Frostbound',
    description: 'Carried by clans who have endured the frozen north.',
    cost: 1000,
    icon: 'ac_unit',
    colors: ['#31809b', '#102b3d', '#bcecff'],
  },
  {
    code: 'SUN_CROWN',
    name: 'Sun Crown',
    description: 'A radiant standard reserved for the realm’s most active clans.',
    cost: 1800,
    icon: 'wb_sunny',
    colors: ['#a45b26', '#44251f', '#ffe082'],
  },
] as const;

export type ClanBannerCode = (typeof CLAN_BANNERS)[number]['code'];
