<template>
  <div class="relative z-10 flex h-full min-h-0 flex-col bg-gray-50">
    <div class="flex min-h-0 flex-1">
      <div class="flex-1 overflow-auto">
        <RouterView />
      </div>

      <AppMenu />
    </div>

    <ChatWindow class="shrink-0" />
  </div>
</template>

<script setup lang="ts">
import AppMenu from '@components/AppMenu.vue';
import ChatWindow from '@components/ChatWindow.vue';
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

const currentUserStore = useCurrentUserStore();

onMounted(async () => {
  if (currentUserStore.user === null) {
    await currentUserStore.fetchCurrentUser();
  }
});
</script>
