import { api } from '@shared/api';

import type { Channel, Message } from '../types';

import routes from '@/routes';

export const chatApi = {
  async getChannels(): Promise<Channel[]> {
    const { data } = await api.get<Channel[]>(routes.api.chat.channelsPath());

    return data;
  },

  async getMessages(channelId: string): Promise<Message[]> {
    const { data } = await api.get<Message[]>(routes.api.chat.messagesPath(channelId));

    return data;
  },

  async sendMessage(channelId: string, text: string, authorId: number): Promise<Message> {
    const { data } = await api.post<Message>(routes.api.chat.messagePath(), {
      channelId,
      text,
      authorId,
    });
    return data;
  },
};
