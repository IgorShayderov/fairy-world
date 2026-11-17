import { useQuery } from '@tanstack/vue-query';
import { computed, onScopeDispose } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { auctionApi } from './api';
import { NOTIFICATIONS_CHANGED } from './notification-events';

export function useNotificationSummary() {
  const user = useCurrentUserStore();
  const query = useQuery({
    queryKey: computed(() => ['notifications-summary', user.user?.id]),
    queryFn: () => auctionApi.summary(),
    enabled: computed(() => !!user.user),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const refresh = () => {
    if (user.user) void query.refetch();
  };
  window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
  onScopeDispose(() => window.removeEventListener(NOTIFICATIONS_CHANGED, refresh));
  return query;
}
