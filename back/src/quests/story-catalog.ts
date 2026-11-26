export type StoryStep = {
  title: string;
  description: string;
  kind: 'VISIT' | 'HUNT';
  x: number;
  y: number;
  radius: number;
  target: number;
  monsterType?: string;
  optionalNoPotion?: boolean;
};
export type StoryDefinition = {
  code: string;
  title: string;
  description: string;
  minLevel: number;
  townId: number;
  steps: StoryStep[];
};

export const STORY_QUESTS: StoryDefinition[] = [
  {
    code: 'silent-quarry',
    title: 'The Silent Quarry',
    minLevel: 5,
    townId: 1,
    description:
      'Stone shipments to Evercross have stopped. The foreman fears that something beneath the old quarry has awakened.',
    steps: [
      {
        title: 'Inspect the abandoned camp',
        description:
          'Travel south of Evercross and investigate the quarry camp. Torn supply sacks may explain the missing workers.',
        kind: 'VISIT',
        x: 1400,
        y: 1170,
        radius: 80,
        target: 1,
      },
      {
        title: 'Recover the stolen tools',
        description:
          'The tracks belong to goblins. Defeat 3 Goblin Raiders in world encounters around the crossroads to recover the tools.',
        kind: 'HUNT',
        x: 1470,
        y: 1100,
        radius: 250,
        monsterType: 'Goblin Raider',
        target: 3,
      },
      {
        title: 'Silence the stone guardian',
        description:
          'The tools bear a broken ward. Defeat a Stone Golem in a world encounter to make the quarry safe again.',
        kind: 'HUNT',
        x: 1470,
        y: 1100,
        radius: 250,
        monsterType: 'Stone Golem',
        target: 1,
        optionalNoPotion: true,
      },
    ],
  },
  {
    code: 'lost-caravan',
    title: 'Tracks in the Whisperwood',
    minLevel: 3,
    townId: 5,
    description:
      'A merchant caravan vanished outside Westmere. Follow its trail and bring news to the waiting families.',
    steps: [
      {
        title: 'Find the broken wagon',
        description: 'Investigate the abandoned wagon east of Westmere. The merchants escaped into the trees.',
        kind: 'VISIT',
        x: 820,
        y: 850,
        radius: 80,
        target: 1,
      },
      {
        title: 'Clear the escape route',
        description: 'Defeat 2 Dire Wolves in world encounters in the Whisperwood so the survivors can leave safely.',
        kind: 'HUNT',
        x: 760,
        y: 920,
        radius: 250,
        monsterType: 'Dire Wolf',
        target: 2,
        optionalNoPotion: true,
      },
      {
        title: 'Bring news to Westmere',
        description:
          'Return to Westmere and report that the road is safe. The survivors have promised a share of their supplies.',
        kind: 'VISIT',
        x: 520,
        y: 850,
        radius: 70,
        target: 1,
      },
    ],
  },
];

export const storyRewards = (level: number) => ({
  gold: 150 * level,
  experience: 200 * level,
  wood: 40 * level,
  stone: 30 * level,
  gemValue: 3 + Math.floor(level / 5),
});
