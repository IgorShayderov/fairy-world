import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import type { Channel, Message } from './types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { StorageService } from '@services/storage.service';

import { chatApi } from './api';

export const useChatStore = defineStore('chat', () => {
  // State
  const channels = ref<Channel[]>([]);
  const messages = ref<Message[]>([]);
  const activeChannelId = ref<string | null>(null);

  const isLoading = ref(false);
  const isMessagesLoading = ref(false);

  // Getters
  const activeChannel = computed(() => channels.value.find((c) => c.id === activeChannelId.value));

  const mergeMessages = (incoming: Message[]) => {
    const uniqueMessages = new Map(messages.value.map((message) => [message.id, message]));
    for (const message of incoming) uniqueMessages.set(message.id, message);
    messages.value = [...uniqueMessages.values()].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  };

  // Actions
  const loadChannels = async () => {
    isLoading.value = true;
    try {
      const data = await chatApi.getChannels();

      channels.value = data;
    } finally {
      isLoading.value = false;
    }
  };

  const selectChannel = async (channelId: string) => {
    activeChannelId.value = channelId;
    isMessagesLoading.value = true;
    messages.value = [];

    try {
      const loadedMessages = await chatApi.getMessages(channelId);
      if (activeChannelId.value === channelId) mergeMessages(loadedMessages);
    } finally {
      isMessagesLoading.value = false;
      // Запоминаем выбранный канал
      StorageService.set('selectedChannelId', channelId);
    }
  };

  const postMessage = async (text: string) => {
    if (!activeChannelId.value || !text.trim()) return;

    const currentUser = useCurrentUserStore();
    const authorId = currentUser.user?.id;
    if (authorId === undefined) return;

    try {
      const newMessage = await chatApi.sendMessage(activeChannelId.value, text.trim());
      mergeMessages([newMessage]);
    } catch (error) {
      console.error('Ошибка при отправке сообщения', error);
    }
  };

  const receiveMessage = (message: Message) => {
    if (message.channelId === activeChannelId.value) {
      mergeMessages([message]);
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
