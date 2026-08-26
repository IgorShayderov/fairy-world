<template>
  <div class="relative z-10 flex h-full min-h-0 flex-col bg-gray-50">
    <div class="flex min-h-0 flex-1">
      <div class="flex-1 overflow-auto p-4">
        <RouterView />
      </div>

      <AppSidebar />
    </div>

    <ChatWindow class="shrink-0" />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppSidebar from '@components/AppSidebar.vue';
import ChatWindow from '@components/ChatWindow.vue';
</script>
