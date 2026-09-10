import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { CurrentUser } from '../api/users';

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
