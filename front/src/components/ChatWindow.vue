<template>
  <div class="mt-auto w-full shrink-0">
    <article
      class="absolute bottom-0 left-0 z-20 flex w-full border-t border-gray-200 bg-white transition-all duration-500 ease-in-out"
      :class="chatClasses"
    >
      <ToggleExpandButton v-model="isExpanded" class="absolute -top-4 left-1/2 z-30 -translate-x-1/2" />
      <ToggleExpandButton v-model="isClosed" class="absolute -top-4 left-11/20 z-30 -translate-x-1/2" />

      <aside class="flex w-1/5 flex-col border-r border-gray-200 bg-gray-50">
        <div class="border-b border-gray-200 p-3 font-bold text-gray-700">
          {{ t('chat.titles.channels') }}
        </div>
        <div class="flex-1 overflow-y-auto">
          <template v-if="chatStore.isLoading">
            <div class="p-4 text-center text-gray-400">
              {{ t('chat.statuses.loadingChannels') }}
            </div>
          </template>
          <template v-else>
            <ChatWindowChannel v-for="channel in chatStore.channels" :key="channel.id" :channel="channel" />
          </template>
        </div>
      </aside>

      <section class="flex h-full w-4/5 flex-col">
        <header class="border-b border-gray-200 p-3 font-bold text-gray-700">
          {{ chatStore.activeChannel ? `# ${chatStore.activeChannel.name}` : t('chat.statuses.selectChannel') }}
        </header>

        <div class="flex-1 space-y-3 overflow-y-auto bg-white p-4" ref="messagesContainer">
          <div v-if="chatStore.isMessagesLoading" class="text-center text-gray-400">
            {{ t('chat.statuses.loadingMessages') }}
          </div>
          <template v-else>
            <ChatWindowMessage v-for="message in chatStore.messages" :key="message.id" :message="message" />
          </template>
        </div>

        <ChatWindowControls />
      </section>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { StorageService } from '@services/storage.service';
import { useTranslation } from 'i18next-vue';
import { reactive, ref, computed, onMounted, nextTick, watch } from 'vue';

import type { ChatPosition } from '@/shared/types/settings';

import { useChatStore } from '@/modules/Chat/store';

import ChatWindowChannel from './ChatWindowChannel.vue';
import ChatWindowControls from './ChatWindowControls.vue';
import ChatWindowMessage from './ChatWindowMessage.vue';

import ToggleExpandButton from '@/components/ToggleExpandButton.vue';

const isExpanded = computed({
  get() {
    return chatState.chatPosition === 'full-screen';
  },
  set(value) {
    setChatPosition(value ? 'full-screen' : 'standard');
  },
});
const isClosed = computed({
  get() {
    return chatState.chatPosition === 'closed';
  },
  set(value) {
    setChatPosition(value ? 'closed' : 'standard');
  },
});
const chatState = reactive<{
  chatPosition: ChatPosition;
}>({
  chatPosition: StorageService.get('chatPosition'),
});
const chatClasses = computed(() => {
  return {
    'h-full shadow-[0_-20px_50px_rgba(0,0,0,0.1)]': isExpanded.value,
    'h-[300px]': chatState.chatPosition === 'standard',
    'h-[0]': isClosed.value,
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

const { t } = useTranslation();
const chatStore = useChatStore();

const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => chatStore.messages, scrollToBottom, { deep: true });

onMounted(async () => {
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
