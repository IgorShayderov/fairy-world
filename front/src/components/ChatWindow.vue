<template>
  <article
    class="realm-chat absolute bottom-0 left-0 z-20 w-full bg-[#071923] text-slate-200 transition-all duration-500 ease-in-out"
    :class="chatClasses"
  >
    <ChatPositioning :chat-position="chatState.chatPosition" @set-positioning="setChatPosition" />

    <div class="flex h-full w-full overflow-hidden">
      <aside class="flex w-1/5 flex-col border-r border-[#35515b] bg-[#0a202b]">
        <div class="border-b border-[#35515b] bg-[#0d2934] p-3 font-bold tracking-wide text-[#f0d68a]">
          {{ t('chat.titles.channels') }}
        </div>
        <div class="flex-1 overflow-y-auto">
          <template v-if="chatStore.isLoading">
            <div class="p-4 text-center text-[#87a4af]">
              {{ t('chat.statuses.loadingChannels') }}
            </div>
          </template>
          <template v-else>
            <ChatChannel v-for="channel in chatStore.channels" :key="channel.id" :channel="channel" />
          </template>
        </div>
      </aside>

      <section class="flex h-full w-4/5 flex-col">
        <header class="border-b border-[#35515b] bg-[#0d2934] p-3 font-bold tracking-wide text-[#f0d68a]">
          {{ chatStore.activeChannel ? `# ${chatStore.activeChannel.name}` : t('chat.statuses.selectChannel') }}
        </header>

        <div class="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,#12313d_0,#081b26_58%,#061620_100%)] p-4" ref="messagesContainer">
          <div v-if="chatStore.isMessagesLoading" class="text-center text-[#87a4af]">
            {{ t('chat.statuses.loadingMessages') }}
          </div>
          <template v-else>
            <section v-for="group in messageGroups" :key="group.key" class="space-y-3">
              <div class="flex items-center gap-3 py-1" role="separator" :aria-label="dateLabel(group)">
                <span class="h-px flex-1 bg-[#36515b]" />
                <time
                  class="rounded-full border border-[#806f43] bg-[#142d35] px-3 py-1 text-[11px] font-semibold text-[#e4c879] shadow-sm shadow-black/30"
                  :datetime="group.key"
                >
                  {{ dateLabel(group) }}
                </time>
                <span class="h-px flex-1 bg-[#36515b]" />
              </div>
              <ChatMessage v-for="message in group.messages" :key="message.id" :message="message" />
            </section>
          </template>
        </div>

        <ChatControls />
      </section>
    </div>
  </article>
</template>

<script lang="ts" setup>
import { useTranslation } from 'i18next-vue';
import { reactive, ref, computed, onMounted, nextTick, watch } from 'vue';

import type { ChatPosition } from '@/shared/types/settings';

import { socket } from '@/boot/socket';
import { groupMessagesByDate } from '@/modules/Chat/dateGroups';
import type { MessageDateGroup } from '@/modules/Chat/dateGroups';
import { useChatStore } from '@modules/Chat/store';
import { StorageService } from '@services/storage.service';

import ChatChannel from '@modules/Chat/components/ChatChannel.vue';
import ChatControls from '@modules/Chat/components/ChatControls.vue';
import ChatMessage from '@modules/Chat/components/ChatMessage.vue';
import ChatPositioning from '@modules/Chat/components/ChatPositioning.vue';

const chatState = reactive<{
  chatPosition: ChatPosition;
}>({
  chatPosition: StorageService.get('chatPosition'),
});
const chatClasses = computed(() => {
  return {
    'h-full border-t border-[#806f43] shadow-[0_-20px_50px_rgba(0,0,0,0.45)]': chatState.chatPosition === 'full-screen',
    'h-[300px] border-t border-[#806f43]': chatState.chatPosition === 'standard',
    'h-0 border-t-0': chatState.chatPosition === 'closed',
  };
});

const setChatPosition = (value: ChatPosition) => {
  chatState.chatPosition = value;
  StorageService.set('chatPosition', value);
};

watch(
  () => chatState.chatPosition,
  (newValue) => {
    StorageService.set('chatPosition', newValue);
  }
);

const { t, i18next } = useTranslation();
const chatStore = useChatStore();
const messageGroups = computed(() => groupMessagesByDate(chatStore.messages));
const dateLabel = (group: MessageDateGroup) => group.isToday
  ? t('chat.labels.today')
  : new Intl.DateTimeFormat(i18next.language, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(group.date);

const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => chatStore.messages, scrollToBottom, { deep: true });

onMounted(async () => {
  // Authenticated tabs can be opened without passing through the login page,
  // so each mounted chat must ensure its own realtime connection is active.
  if (!socket.connected) socket.connect();

  await chatStore.loadChannels();

  const [firstChannel] = chatStore.channels;
  const savedChannelId = StorageService.get('selectedChannelId');

  if (savedChannelId) {
    await chatStore.selectChannel(savedChannelId);
  } else if (firstChannel) {
    await chatStore.selectChannel(firstChannel.id);
  }
});
</script>

<style scoped>
.realm-chat :is(aside, div) {
  scrollbar-color: #52717b #081b26;
}
</style>
