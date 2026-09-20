import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '@/modules/Chat/types';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  api: mocks,
}));

vi.mock('@/modules/Auth/store/currentUser', () => ({
  useCurrentUserStore: () => ({ user: { id: 5 } }),
}));

vi.mock('@services/storage.service', () => ({
  StorageService: { set: vi.fn() },
}));

import { useChatStore } from '@/modules/Chat/store';

const message: Message = {
  id: 'message-1',
  channelId: 'general',
  authorId: 5,
  author: { id: 5, name: 'Igor' },
  text: 'Hello',
  createdAt: '2026-09-20T18:00:00.000Z',
};

describe('realtime chat messages', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('keeps one copy when the same socket message arrives repeatedly', () => {
    const store = useChatStore();
    store.activeChannelId = 'general';

    store.receiveMessage(message);
    store.receiveMessage(message);

    expect(store.messages).toEqual([message]);
  });

  it('merges the HTTP response with its socket broadcast by message id', async () => {
    let resolveRequest!: (value: { data: Message }) => void;
    mocks.post.mockReturnValue(new Promise<{ data: Message }>((resolve) => {
      resolveRequest = resolve;
    }));

    const store = useChatStore();
    store.activeChannelId = 'general';

    const request = store.postMessage('Hello');
    store.receiveMessage(message);
    resolveRequest({ data: message });
    await request;

    expect(store.messages).toEqual([message]);
  });
});
