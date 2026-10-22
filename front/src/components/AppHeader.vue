<template>
  <header
    class="flex max-h-(--header-height) min-h-(--header-height) items-center justify-between bg-gray-800 px-4 py-2 text-white"
  >
    <div class="flex items-center gap-2">
      <span class="text-lg font-bold tracking-wide">✦ {{ appName }}</span>
    </div>
    <div class="flex items-center gap-3"><FeedbackButton /><NotificationDrawer /></div>
  </header>
</template>

<script setup lang="ts">
import NotificationDrawer from '@/modules/Auction/NotificationDrawer.vue';
import FeedbackButton from '@/modules/Feedback/FeedbackButton.vue';

const appName = import.meta.env.VITE_APP_NAME;
</script>
