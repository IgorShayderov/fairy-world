import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { chatApi } from './api';
import type { Channel, Message } from './types';

export const useChatStore = defineStore('chat', () => {
  // State
  const channels = ref<Channel[]>([]);
  const messages = ref<Message[]>([]);
  const activeChannelId = ref<string | null>(null);

  const isLoading = ref(false);
  const isMessagesLoading = ref(false);

  // Getters
  const activeChannel = computed(() => channels.value.find((c) => c.id === activeChannelId.value));

  // Actions
  const loadChannels = async () => {
    isLoading.value = true;
    try {
      channels.value = await chatApi.getChannels();

      if (channels.value.length > 0 && !activeChannelId.value) {
        await selectChannel(channels.value[0].id);
      }
    } finally {
      isLoading.value = false;
    }
  };

  const selectChannel = async (channelId: string) => {
    activeChannelId.value = channelId;
    isMessagesLoading.value = true;
    messages.value = [];
    try {
      messages.value = await chatApi.getMessages(channelId);
    } finally {
      isMessagesLoading.value = false;
    }
  };

  const postMessage = async (text: string) => {
    if (!activeChannelId.value || !text.trim()) return;

    try {
      const newMessage = await chatApi.sendMessage(activeChannelId.value, text.trim());
      messages.value.push(newMessage);
    } catch (error) {
      console.error('Ошибка при отправке сообщения', error);
    }
  };

  const receiveMessage = (message: Message) => {
    if (message.channelId === activeChannelId.value) {
      messages.value.push(message);
    } else {
      // Здесь в будущем можно увеличивать счетчик непрочитанных сообщений
      // для других каналов в боковом меню
      console.log(`Новое сообщение в скрытом канале ${message.channelId}`);
    }
  };

  return {
    channels,
    messages,
    activeChannelId,
    activeChannel,
    isLoading,
    isMessagesLoading,
    loadChannels,
    selectChannel,
    postMessage,
    receiveMessage,
  };
});
