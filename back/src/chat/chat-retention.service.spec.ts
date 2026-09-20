import { ChatRetentionService } from './chat-retention.service';
import type { PrismaService } from '../prisma.service';

describe('ChatRetentionService', () => {
  const deleteMany = jest.fn();
  const service = new ChatRetentionService({ message: { deleteMany } } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    deleteMany.mockResolvedValue({ count: 2 });
  });

  it('removes messages older than 30 days', async () => {
    const now = new Date('2026-09-20T12:00:00.000Z');

    await expect(service.removeStaleMessages(now)).resolves.toBe(2);

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: { lt: new Date('2026-08-21T12:00:00.000Z') },
      },
    });
  });
});
