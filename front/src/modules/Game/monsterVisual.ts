const BATTLE_MONSTER_ASSETS = [
  '/images/battle/enemy-goblin.png',
  '/images/battle/enemy-dire-wolf.png',
  '/images/battle/enemy-bone-knight.png',
  '/images/battle/enemy-forest-troll.png',
  '/images/battle/enemy-stone-golem.png',
  '/images/battle/enemy-void-wraith.png',
  '/images/battle/enemy-storm-harpy.png',
  '/images/battle/enemy-dragon.png',
] as const;

const VISUAL_RULES: Array<{ terms: string[]; asset: string }> = [
  { terms: ['minotaur'], asset: '/images/battle/enemy-brute.png' },
  { terms: ['goblin', 'raider', 'bandit'], asset: '/images/battle/enemy-goblin.png' },
  { terms: ['wolf'], asset: '/images/battle/enemy-dire-wolf.png' },
  { terms: ['bone', 'skeleton', 'knight'], asset: '/images/battle/enemy-bone-knight.png' },
  { terms: ['troll', 'giant', 'lurker'], asset: '/images/battle/enemy-forest-troll.png' },
  { terms: ['golem', 'brute'], asset: '/images/battle/enemy-stone-golem.png' },
  { terms: ['wraith', 'stalker', 'hag', 'siren'], asset: '/images/battle/enemy-void-wraith.png' },
  { terms: ['harpy'], asset: '/images/battle/enemy-storm-harpy.png' },
  { terms: ['dragon', 'chimera', 'serpent'], asset: '/images/battle/enemy-dragon.png' },
];

const stableIndex = (value: string, length: number) => {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % length;
};

export const getBattleMonsterVisual = (monsterType: string | undefined, monsterName: string) => {
  const typeIdentity = monsterType?.trim().toLowerCase() ?? '';
  const nameIdentity = monsterName.trim().toLowerCase();
  const findMatch = (identity: string) =>
    VISUAL_RULES.find(({ terms }) => terms.some((term) => identity.includes(term)))?.asset;
  return (
    findMatch(typeIdentity) ??
    findMatch(nameIdentity) ??
    BATTLE_MONSTER_ASSETS[stableIndex(`${typeIdentity} ${nameIdentity}`, BATTLE_MONSTER_ASSETS.length)]
  );
};
