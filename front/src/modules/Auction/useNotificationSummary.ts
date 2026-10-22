import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { auctionApi } from './api';

export function useNotificationSummary() {
  const user = useCurrentUserStore();
  return useQuery({
    queryKey: computed(() => ['notifications-summary', user.user?.id]),
    queryFn: () => auctionApi.summary(),
    enabled: computed(() => !!user.user),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}
