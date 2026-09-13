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

  const fetchCurrentUser = (force = false): Promise<CurrentUser> => {
    if (!force && user.value) return Promise.resolve(user.value);
    if (fetchPromise) return fetchPromise;

    isLoading.value = true;
    fetchPromise = usersApi
      .getMe()
      .then((currentUser) => {
        if (user.value?.id === currentUser.id && currentUser.level > user.value.level) {
          Notify.create({ type: 'positive', timeout: 6000, message: i18n.t('profile.levelUp', { level: currentUser.level }) });
        }
        user.value = currentUser;
        return currentUser;
      })
      .finally(() => {
        isLoading.value = false;
        fetchPromise = null;
      });

    return fetchPromise;
  };

  const reset = () => {
    user.value = null;
  };

  return {
    user,
    isLoading,
    fetchCurrentUser,
    reset,
  };
});
