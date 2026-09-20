<template>
  <div class="flex flex-col" :class="isOwnMessage ? 'items-end' : 'items-start'">
    <div
      class="block max-w-[80%] rounded-lg border p-2 text-sm shadow-sm"
      :class="isOwnMessage
        ? 'border-sky-500 bg-sky-200 text-sky-950 shadow-sky-300/60 ring-1 ring-sky-400/50'
        : 'border-gray-200 bg-gray-100 text-gray-800'"
    >
      <div class="mb-1 flex items-baseline gap-2 border-b border-current/10 pb-1">
        <span class="font-semibold">{{ senderName }}</span>
        <time class="text-[10px] opacity-60" :datetime="$props.message.createdAt">{{ sentAt }}</time>
      </div>
      <p class="m-0 whitespace-pre-wrap break-words">{{ $props.message.text }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';

import type { Message } from '@/modules/Chat/types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
const { t } = useTranslation();
const currentUserStore = useCurrentUserStore();

const isOwnMessage = computed(() => currentUserStore.user?.id === $props.message.authorId);
const senderName = computed(() => isOwnMessage.value ? t('chat.labels.you') : ($props.message.author?.name ?? ''));
const sentAt = computed(() => {
  const date = new Date($props.message.createdAt);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

const $props = defineProps<{
  message: Message;
}>();
</script>
