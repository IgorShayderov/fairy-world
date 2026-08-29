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
import { RouterView } from 'vue-router';

import AppMenu from '@components/AppMenu.vue';
import ChatWindow from '@components/ChatWindow.vue';
</script>
