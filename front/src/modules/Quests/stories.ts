import { ref } from 'vue';

import routes from '@/routes';
import { api } from '@/shared/api';

import { getQuests } from './api';

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
export type StoryQuest = {
  code: string;
  title: string;
  description: string;
  minLevel: number;
  townId: number;
  town: { name: string; x: number; y: number };
  steps: StoryStep[];
  progress: {
    step: number;
    progress: number;
    completedAt: string | null;
    claimedAt: string | null;
    bonusEarned: boolean;
    rewardChoice: string | null;
  } | null;
  rewards: { gold: number; experience: number; wood: number; stone: number; gemValue: number };
  canChooseResources: boolean;
};
const storiesPath = () => `${routes.api.quests.listPath()}/stories`;
export const getStories = async () => (await api.get<StoryQuest[]>(storiesPath())).data;
export const storyAction = async (code: string, action: 'accept' | 'investigate' | 'claim', choice?: string) =>
  api.post(`${storiesPath()}/${encodeURIComponent(code)}/${action}`, { choice });

// Only the selection is local; objective coordinates and progress come from the server.
export const trackingVersion = ref(0);
export function trackedQuest(userId: number) {
  try {
    return localStorage.getItem(`fw_tracked_quest_${userId}`);
  } catch {
    return null;
  }
}
export function trackQuest(userId: number, key: string | null) {
  try {
    if (key) localStorage.setItem(`fw_tracked_quest_${userId}`, key);
    else localStorage.removeItem(`fw_tracked_quest_${userId}`);
  } catch {
    /* Tracking is optional when storage is unavailable. */
  }
  trackingVersion.value++;
}
export type TrackedObjective = {
  title: string;
  description: string;
  x: number;
  y: number;
  progress: number;
  target: number;
  storyCode?: string;
  investigate?: boolean;
  ready?: boolean;
};
export async function loadTrackedObjective(userId: number): Promise<TrackedObjective | null> {
  const key = trackedQuest(userId);
  if (!key) return null;
  if (key.startsWith('story:')) {
    const story = (await getStories()).find((story) => `story:${story.code}` === key);
    if (!story?.progress || story.progress.claimedAt) return null;
    const step = story.steps[story.progress.step];
    if (!step)
      return {
        title: story.title,
        description: 'Story complete — choose your reward in the quest journal.',
        x: story.town.x,
        y: story.town.y,
        progress: 1,
        target: 1,
        ready: true,
      };
    return {
      title: story.title,
      description: step.title,
      x: step.x,
      y: step.y,
      progress: story.progress.progress,
      target: step.target,
      storyCode: story.code,
      investigate: step.kind === 'VISIT',
    };
  }
  const entry = (await getQuests()).active.find((entry) => `quest:${entry.questId}` === key);
  const location = entry?.quest.destination ?? entry?.quest.huntingLocation;
  return entry && location
    ? {
        title: entry.quest.destination
          ? `Delivery to ${entry.quest.destination.name}`
          : `Hunt ${entry.quest.monsterType}`,
        description: entry.quest.destination
          ? 'Deliver the message at the destination town.'
          : `Defeat ${entry.quest.monsterType}`,
        x: location.x,
        y: location.y,
        progress: entry.progress,
        target: entry.quest.target,
      }
    : null;
}
