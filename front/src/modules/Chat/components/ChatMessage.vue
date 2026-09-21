<template>
  <div class="flex flex-col" :class="isOwnMessage ? 'items-end' : 'items-start'">
    <div
      class="block max-w-[80%] rounded-lg border p-2 text-sm shadow-sm"
      :class="isOwnMessage
        ? 'border-[#55bfd3] bg-[#164657] text-[#eefbfc] shadow-black/30 ring-1 ring-[#55bfd3]/35'
        : 'border-[#3b5660] bg-[#122d38] text-[#dbe7e9] shadow-black/30'"
    >
      <div class="mb-1 flex items-baseline gap-2 border-b border-current/10 pb-1">
        <span class="font-semibold" :class="isOwnMessage ? 'text-[#8fe5f0]' : 'text-[#f0d68a]'">{{ senderName }}</span>
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
