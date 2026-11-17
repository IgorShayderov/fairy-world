import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api';
import { getQuests } from '@/modules/Quests/api';
import { loadTrackedObjective, trackedQuest, trackQuest, type StoryQuest } from '@/modules/Quests/stories';

vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/modules/Quests/api', () => ({ getQuests: vi.fn() }));

const story: StoryQuest = {
  code: 'silent-quarry',
  title: 'The Silent Quarry',
  description: 'Investigate',
  minLevel: 5,
  townId: 1,
  town: { name: 'EVERCROSS', x: 1470, y: 960 },
  steps: [
    {
      title: 'Inspect the camp',
      description: 'Travel to the camp',
      kind: 'VISIT',
      x: 1400,
      y: 1170,
      radius: 80,
      target: 1,
    },
  ],
  progress: { step: 0, progress: 0, completedAt: null, claimedAt: null, bonusEarned: false, rewardChoice: null },
  rewards: { gold: 750, experience: 1000, wood: 200, stone: 150, gemValue: 4 },
  canChooseResources: true,
};
beforeEach(() => {
  vi.resetAllMocks();
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('quest map tracking', () => {
  it('keeps one selected objective per player and skips requests when nothing is tracked', async () => {
    trackQuest(1, 'story:silent-quarry');
    trackQuest(1, 'quest:12');
    expect(trackedQuest(1)).toBe('quest:12');
    expect(await loadTrackedObjective(2)).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
    trackQuest(1, null);
    expect(trackedQuest(1)).toBeNull();
  });
  it('loads the current server objective and replaces it with a claim prompt on completion', async () => {
    trackQuest(1, 'story:silent-quarry');
    vi.mocked(api.get).mockResolvedValue({ data: [story] } as never);
    expect(await loadTrackedObjective(1)).toMatchObject({
      x: 1400,
      y: 1170,
      investigate: true,
      progress: 0,
      target: 1,
    });
    vi.mocked(api.get).mockResolvedValue({
      data: [{ ...story, progress: { ...story.progress, step: 1, completedAt: '2026-11-13' } }],
    } as never);
    expect(await loadTrackedObjective(1)).toMatchObject({ ready: true, x: 1470, y: 960 });
    vi.mocked(api.get).mockResolvedValue({
      data: [{ ...story, progress: { ...story.progress, claimedAt: '2026-11-13' } }],
    } as never);
    expect(await loadTrackedObjective(1)).toBeNull();
  });
  it('does not expose unaccepted stories or stale canceled contracts as objectives', async () => {
    trackQuest(1, 'story:silent-quarry');
    vi.mocked(api.get).mockResolvedValue({ data: [{ ...story, progress: null }] } as never);
    expect(await loadTrackedObjective(1)).toBeNull();
    trackQuest(1, 'quest:12');
    vi.mocked(getQuests).mockResolvedValue({ active: [], available: [], completed: [], town: null });
    expect(await loadTrackedObjective(1)).toBeNull();
  });
});
