import { defineStore } from 'pinia';
import { Notify } from 'quasar';
import { ref } from 'vue';

import type { CurrentUser } from '../api/users';

import { i18n } from '@/locales/i18n';

import { usersApi } from '../api/users';

export const useCurrentUserStore = defineStore('currentUser', () => {
  const user = ref<CurrentUser | null>(null);
  const isLoading = ref(false);
  let fetchPromise: Promise<CurrentUser> | null = null;
  let fetchVersion = 0;

  const fetchCurrentUser = (force = false): Promise<CurrentUser> => {
    if (!force && user.value) return Promise.resolve(user.value);
    if (fetchPromise && !force) return fetchPromise;

    const version = ++fetchVersion;
    isLoading.value = true;
    fetchPromise = usersApi
      .getMe()
      .then((currentUser) => {
        // Ignore responses started before a mutation refresh or logout.
        if (version !== fetchVersion) return currentUser;
        if (user.value?.id === currentUser.id && currentUser.level > user.value.level) {
          Notify.create({ type: 'positive', timeout: 6000, message: i18n.t('profile.levelUp', { level: currentUser.level }) });
        }
        const completed = (currentUser.accomplishedQuests ?? 0) - (user.value?.accomplishedQuests ?? 0);
        if (user.value?.id === currentUser.id && completed > 0) {
          Notify.create({ type: 'positive', timeout: 6000, message: i18n.t('quests.completedNotice', { count: completed }) });
        }
        user.value = currentUser;
        return currentUser;
      })
      .finally(() => {
        if (version !== fetchVersion) return;
        isLoading.value = false;
        fetchPromise = null;
      });

    return fetchPromise;
  };

  const reset = () => {
    fetchVersion++;
    fetchPromise = null;
    isLoading.value = false;
    user.value = null;
  };

  return {
    user,
    isLoading,
    fetchCurrentUser,
    reset,
  };
});
