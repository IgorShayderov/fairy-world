export type MonsterModel = { file: string; height: number; facing?: number };

/** Authoritative archetype first; rank prefixes and display names never choose the model. */
export const monsterModels: Record<string, MonsterModel> = {
  'Goblin Raider': { file: 'goblin', height: 2.1 },
  'Dire Wolf': { file: 'wolf', height: 1.8 },
  'Bone Knight': { file: 'bone-knight', height: 2.35 },
  'Forest Troll': { file: 'bog-lurker', height: 3.2 },
  'Shadow Stalker': { file: 'harpy', height: 2.3 },
  'Storm Harpy': { file: 'harpy', height: 2.5 },
  'Stone Golem': { file: 'golem', height: 3.1 },
  'Void Wraith': { file: 'wraith', height: 2.8 },
  'Infernal Minotaur': { file: 'minotaur', height: 3 },
  'Arcane Chimera': { file: 'chimera', height: 2.2 },
  'Frost Giant': { file: 'golem', height: 3.8 },
  Dragon: { file: 'dragon', height: 3 },
  'Lake Serpent': { file: 'dragon', height: 2.6 },
  'Drowned Siren': { file: 'hag', height: 2.6 },
  'Bog Lurker': { file: 'bog-lurker', height: 2.8 },
  'Mire Hag': { file: 'hag', height: 2.5 },
};

export function battleMonsterModel(monsterType: string, name = ''): MonsterModel {
  const canonical = Object.keys(monsterModels).find((key) => key.toLowerCase() === monsterType.toLowerCase());
  if (canonical) return monsterModels[canonical]!;
  const label = `${monsterType} ${name}`.toLowerCase();
  const aliases: [RegExp, string][] = [
    [/wolf|rimeclaw/, 'Dire Wolf'], [/goblin/, 'Goblin Raider'], [/bone|skeleton|knight/, 'Bone Knight'],
    [/wraith|spirit|ghost/, 'Void Wraith'], [/golem|stone|brute/, 'Stone Golem'],
    [/minotaur|demon/, 'Infernal Minotaur'], [/dragon/, 'Dragon'], [/chimera/, 'Arcane Chimera'],
    [/harpy/, 'Storm Harpy'], [/troll/, 'Forest Troll'], [/giant|sovereign/, 'Frost Giant'],
    [/serpent/, 'Lake Serpent'], [/siren/, 'Drowned Siren'], [/hag/, 'Mire Hag'],
    [/bog|lurker/, 'Bog Lurker'], [/stalker/, 'Shadow Stalker'],
  ];
  return monsterModels[aliases.find(([pattern]) => pattern.test(label))?.[1] ?? 'Bone Knight']!;
}
