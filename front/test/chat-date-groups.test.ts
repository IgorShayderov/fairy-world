import { describe, expect, it } from 'vitest';

import type { Message } from '@/modules/Chat/types';

import { groupMessagesByDate } from '@/modules/Chat/dateGroups';

const message = (id: string, createdAt: Date): Message => ({
  id,
  channelId: 'general',
  authorId: 1,
  author: { id: 1, name: 'Mage' },
  text: id,
  createdAt: createdAt.toISOString(),
});

describe('chat date groups', () => {
  it('groups messages by local calendar date and marks today', () => {
    const today = new Date(2026, 8, 20, 18, 0);
    const groups = groupMessagesByDate([
      message('yesterday', new Date(2026, 8, 19, 23, 30)),
      message('morning', new Date(2026, 8, 20, 8, 0)),
      message('evening', new Date(2026, 8, 20, 17, 0)),
    ], today);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.messages.map(({ id }) => id)).toEqual(['yesterday']);
    expect(groups[0]?.isToday).toBe(false);
    expect(groups[1]?.messages.map(({ id }) => id)).toEqual(['morning', 'evening']);
    expect(groups[1]?.isToday).toBe(true);
  });
});
