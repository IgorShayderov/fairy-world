import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
const { useQuery, refetch, user } = vi.hoisted(() => {
  const refetch = vi.fn();
  return { refetch, useQuery: vi.fn((_options: unknown) => ({ refetch })), user: { user: { id: 7 } as { id: number } | null } };
});
vi.mock('@tanstack/vue-query', () => ({ useQuery }));
vi.mock('@/modules/Auth/store/currentUser', () => ({ useCurrentUserStore: () => user }));
vi.mock('@/modules/Auction/api', () => ({ auctionApi: { summary: vi.fn() } }));
import { useNotificationSummary } from '@/modules/Auction/useNotificationSummary';
import { NOTIFICATIONS_CHANGED } from '@/modules/Auction/notification-events';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  user.user = { id: 7 };
});
describe('notification summary refresh', () => {
  it('uses server events instead of polling and removes its listener on disposal', () => {
    const window = new EventTarget();
    vi.stubGlobal('window', window);
    const scope = effectScope();
    scope.run(useNotificationSummary);
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ staleTime: Infinity, refetchOnWindowFocus: false })
    );
    expect(useQuery.mock.calls[0]?.[0]).not.toHaveProperty('refetchInterval');
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    expect(refetch).toHaveBeenCalledTimes(1);
    user.user = null;
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    expect(refetch).toHaveBeenCalledTimes(1);
    scope.stop();
    user.user = { id: 7 };
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
