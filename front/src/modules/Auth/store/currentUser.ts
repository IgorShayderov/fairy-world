import { defineStore } from 'pinia';
import { ref } from 'vue';

import { usersApi } from '../api/users';
import type { CurrentUser } from '../api/users';

export const useCurrentUserStore = defineStore('currentUser', () => {
  const user = ref<CurrentUser | null>(null);
  const isLoading = ref(false);

  const fetchCurrentUser = async () => {
    isLoading.value = true;
    try {
      user.value = await usersApi.getMe();
    } finally {
      isLoading.value = false;
    }
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
