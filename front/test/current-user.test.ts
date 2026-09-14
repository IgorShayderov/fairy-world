import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getMe: vi.fn(), notify: vi.fn() }));
vi.mock('quasar', () => ({ Notify: { create: mocks.notify } }));

vi.mock('@/modules/Auth/api/users', () => ({ usersApi: { getMe: mocks.getMe } }));

import { i18n, initializeI18n } from '@/locales/i18n';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

describe('current user loading', () => {
  it('does not restore pre-death buffs from an older in-flight request', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.getMe.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const store = useCurrentUserStore();
    const oldRequest = store.fetchCurrentUser();
    mocks.getMe.mockResolvedValueOnce({ id: 5, level: 1, activeBuffs: [] });
    await store.fetchCurrentUser(true);
    resolveOld({ id: 5, level: 1, activeBuffs: [{ type: 'DAMAGE', value: 5 }] });
    await oldRequest;
    expect(store.user?.activeBuffs).toEqual([]);
    expect(mocks.getMe).toHaveBeenCalledTimes(2);
  });
  it('notifies once on quest completion, but not on initial load or unchanged data', async () => {
    const store = useCurrentUserStore();
    mocks.getMe.mockResolvedValue({ id: 5, level: 1, accomplishedQuests: 3 });
    await store.fetchCurrentUser();
    expect(mocks.notify).not.toHaveBeenCalled();
    mocks.getMe.mockResolvedValue({ id: 5, level: 1, accomplishedQuests: 4 });
    await store.fetchCurrentUser(true);
    await store.fetchCurrentUser(true);
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Quests completed: 1! Your rewards have been added.' }));
  });
  it('notifies once when refreshed data confirms a level-up', async () => {
    const store = useCurrentUserStore();
    mocks.getMe.mockResolvedValue({ id: 5, level: 1 });
    await store.fetchCurrentUser();
    expect(mocks.notify).not.toHaveBeenCalled();
    mocks.getMe.mockResolvedValue({ id: 5, level: 2 });
    await store.fetchCurrentUser(true);
    await store.fetchCurrentUser(true);
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Level 2 reached!',
      })
    );
  });
  beforeEach(async () => {
    await initializeI18n();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('uses the active application language for level-up text', async () => {
    await i18n.changeLanguage('ru');
    const store = useCurrentUserStore();
    mocks.getMe.mockResolvedValue({ id: 5, level: 1 });
    await store.fetchCurrentUser();
    mocks.getMe.mockResolvedValue({ id: 5, level: 2 });
    await store.fetchCurrentUser(true);
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Достигнут уровень 2!',
      })
    );
  });

  it('coalesces simultaneous /me loads and reuses the cached user', async () => {
    const player = {
      id: 1,
      name: 'Player',
      email: 'player@example.com',
      gold: 100,
      gems: 5,
      experience: 20,
      level: 2,
      freeAttributes: 0,
      mapPosition: { x: 1470, y: 1040 },
      activeBuffs: [],
      inventory: [],
      equippedItems: [],
      attributes: [],
      properties: [],
    };
    mocks.getMe.mockResolvedValue(player);
    const store = useCurrentUserStore();

    const [first, second] = await Promise.all([store.fetchCurrentUser(), store.fetchCurrentUser()]);
    const cached = await store.fetchCurrentUser();

    expect(mocks.getMe).toHaveBeenCalledTimes(1);
    expect(first).toEqual(player);
    expect(second).toEqual(player);
    expect(cached).toEqual(player);
  });
});
