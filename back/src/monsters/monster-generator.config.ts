import { AttributeType } from '../../generated/client';

export interface MonsterArchetype {
  name: string;
  description: string;
  primaryAttribute: AttributeType;
  secondaryAttribute: AttributeType;
}

export interface MonsterRank {
  name: string;
  weight: number;
  powerMultiplier: number;
  rewardMultiplier: number;
}

export const MONSTER_ARCHETYPES: MonsterArchetype[] = [
  {
    name: 'Goblin Raider',
    description: 'A cunning raider armed with scavenged weapons.',
    primaryAttribute: AttributeType.AGILITY,
    secondaryAttribute: AttributeType.STRENGTH,
  },
  {
    name: 'Dire Wolf',
    description: 'A relentless predator that hunts travelers in packs.',
    primaryAttribute: AttributeType.AGILITY,
    secondaryAttribute: AttributeType.ENDURANCE,
  },
  {
    name: 'Bone Knight',
    description: 'An armored warrior animated by forgotten magic.',
    primaryAttribute: AttributeType.ENDURANCE,
    secondaryAttribute: AttributeType.STRENGTH,
  },
  {
    name: 'Forest Troll',
    description: 'A hulking creature with immense strength and resilience.',
    primaryAttribute: AttributeType.STRENGTH,
    secondaryAttribute: AttributeType.ENDURANCE,
  },
  {
    name: 'Shadow Stalker',
    description: 'A silent hunter that slips between light and darkness.',
    primaryAttribute: AttributeType.AGILITY,
    secondaryAttribute: AttributeType.WISDOM,
  },
  {
    name: 'Storm Harpy',
    description: 'A winged hunter surrounded by crackling storm magic.',
    primaryAttribute: AttributeType.AGILITY,
    secondaryAttribute: AttributeType.WISDOM,
  },
  {
    name: 'Stone Golem',
    description: 'A tireless guardian carved from enchanted mountain rock.',
    primaryAttribute: AttributeType.ENDURANCE,
    secondaryAttribute: AttributeType.STRENGTH,
  },
  {
    name: 'Void Wraith',
    description: 'A restless spirit sustained by forbidden sorcery.',
    primaryAttribute: AttributeType.WISDOM,
    secondaryAttribute: AttributeType.AGILITY,
  },
  {
    name: 'Infernal Minotaur',
    description: 'A brutal maze guardian wreathed in infernal flame.',
    primaryAttribute: AttributeType.STRENGTH,
    secondaryAttribute: AttributeType.ENDURANCE,
  },
  {
    name: 'Arcane Chimera',
    description: 'A magical beast formed from several dangerous creatures.',
    primaryAttribute: AttributeType.WISDOM,
    secondaryAttribute: AttributeType.ENDURANCE,
  },
  {
    name: 'Frost Giant',
    description: 'An ancient giant whose footsteps freeze the earth.',
    primaryAttribute: AttributeType.STRENGTH,
    secondaryAttribute: AttributeType.ENDURANCE,
  },
  {
    name: 'Dragon',
    description: 'A mighty scaled predator guarding its enchanted domain.',
    primaryAttribute: AttributeType.STRENGTH,
    secondaryAttribute: AttributeType.WISDOM,
  },
];

export const MONSTER_RANKS: MonsterRank[] = [
  { name: 'Wandering', weight: 35, powerMultiplier: 0.85, rewardMultiplier: 0.8 },
  { name: 'Savage', weight: 30, powerMultiplier: 1, rewardMultiplier: 1 },
  { name: 'Cursed', weight: 20, powerMultiplier: 1.1, rewardMultiplier: 1.25 },
  { name: 'Elder', weight: 10, powerMultiplier: 1.2, rewardMultiplier: 1.55 },
  { name: 'Mythic', weight: 5, powerMultiplier: 1.35, rewardMultiplier: 2 },
];
