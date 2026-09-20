<template>
  <div
    :key="$props.channel.id"
    @click="chatStore.selectChannel($props.channel.id)"
    class="cursor-pointer border-b border-[#29434d] p-3 text-sm transition-colors"
    :class="
      chatStore.activeChannelId === channel.id
        ? 'border-l-4 border-l-[#e4c879] bg-[#173a45] font-semibold text-[#f2dc9a]'
        : 'text-[#a9bec8] hover:bg-[#102e39] hover:text-[#e5eef0]'
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
