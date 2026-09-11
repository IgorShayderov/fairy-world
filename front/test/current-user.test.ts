import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getMe: vi.fn() }));

vi.mock('@/modules/Auth/api/users', () => ({ usersApi: { getMe: mocks.getMe } }));

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

describe('current user loading', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
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
