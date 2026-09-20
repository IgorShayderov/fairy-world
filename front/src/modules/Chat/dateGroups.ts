import type { Message } from './types';

export interface MessageDateGroup {
  date: Date;
  key: string;
  messages: Message[];
  isToday: boolean;
}

const localDateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

export const groupMessagesByDate = (messages: Message[], today = new Date()): MessageDateGroup[] => {
  const todayKey = localDateKey(today);
  const groups = new Map<string, MessageDateGroup>();

  for (const message of messages) {
    const date = new Date(message.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDateKey(date);
    const group = groups.get(key) ?? { date, key, messages: [], isToday: key === todayKey };
    group.messages.push(message);
    groups.set(key, group);
  }

  return [...groups.values()];
};
