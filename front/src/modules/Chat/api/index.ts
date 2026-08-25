import type { Channel, Message } from '../types';

// Фейковая база данных
const MOCK_CHANNELS: Channel[] = [
  { id: 'general', name: 'Общий' },
  { id: 'dev', name: 'Разработка' },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  general: [
    {
      id: '1',
      channelId: 'general',
      text: 'Всем привет в общем чате!',
      createdAt: new Date().toISOString(),
    },
  ],
  dev: [{ id: '2', channelId: 'dev', text: 'Когда релиз?', createdAt: new Date().toISOString() }],
};

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const chatApi = {
  async getChannels(): Promise<Channel[]> {
    await delay();
    return MOCK_CHANNELS;
  },

  async getMessages(channelId: string): Promise<Message[]> {
    await delay();
    return MOCK_MESSAGES[channelId] || [];
  },

  async sendMessage(channelId: string, text: string): Promise<Message> {
    await delay();
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      channelId,
      text,
      createdAt: new Date().toISOString(),
    };

    if (!MOCK_MESSAGES[channelId]) MOCK_MESSAGES[channelId] = [];
    MOCK_MESSAGES[channelId].push(newMessage);

    return newMessage;
  },
};
