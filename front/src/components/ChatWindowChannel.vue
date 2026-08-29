<template>
  <div
    :key="$props.channel.id"
    @click="chatStore.selectChannel($props.channel.id)"
    class="cursor-pointer border-b border-gray-100 p-3 text-sm transition-colors"
    :class="
      chatStore.activeChannelId === channel.id
        ? 'border-l-4 border-l-blue-500 bg-blue-100 text-blue-800'
        : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
    "
  >
    # {{ channel.name }}
  </div>
</template>

<script lang="ts" setup>
import type { Channel } from '@/modules/Chat/types';

import { useChatStore } from '@/modules/Chat/store';

const chatStore = useChatStore();

const $props = defineProps<{
  channel: Channel;
}>();
</script>

<style lang="scss" module></style>
