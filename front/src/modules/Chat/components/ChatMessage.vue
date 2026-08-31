<template>
  <div class="flex flex-col" :class="isOwnMessage ? 'items-end' : 'items-start'">
    <div
      class="block max-w-[80%] rounded p-2 text-sm"
      :class="isOwnMessage ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'"
    >
      {{ $props.message.text }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import type { Message } from '@/modules/Chat/types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
const currentUserStore = useCurrentUserStore();

const isOwnMessage = computed(() => currentUserStore.user?.id === $props.message.authorId);

const $props = defineProps<{
  message: Message;
}>();
</script>
