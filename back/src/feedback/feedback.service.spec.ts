import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma.service';

describe('FeedbackService', () => {
  const tx = {
    feedback: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    feedbackReply: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn() };
  const service = new FeedbackService(prisma as unknown as PrismaService);
  const input = { requestId: 'new', category: 'EXPERIENCE' as const, message: 'I enjoy this game.', rating: 4 };
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
    tx.feedback.count.mockResolvedValue(0);
    tx.feedbackReply.count.mockResolvedValue(0);
  });
  it('stores the authenticated author, and retries do not duplicate feedback', async () => {
    await service.submit(7, input);
    expect(tx.feedback.create).toHaveBeenCalledWith({
      data: { id: 'new', userId: 7, category: 'EXPERIENCE', rating: 4, message: input.message },
      select: { id: true },
    });
    tx.feedback.findUnique.mockResolvedValue({ id: 'new', userId: 7 });
    await expect(service.submit(7, input)).resolves.toEqual({ id: 'new' });
    expect(tx.feedback.create).toHaveBeenCalledTimes(1);
    await expect(service.submit(8, input)).rejects.toThrow('Request ID already used');
  });
  it('caps feedback submissions at five per day', async () => {
    tx.feedback.count.mockResolvedValue(5);
    await expect(service.submit(7, input)).rejects.toMatchObject({ status: 429 });
    expect(tx.feedback.create).not.toHaveBeenCalled();
  });
  it('scopes player access to their own feedback', async () => {
    tx.feedback.findFirst.mockResolvedValue(null);
    await expect(service.get('other', 7)).rejects.toThrow('not found');
    expect(tx.feedback.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'other', userId: 7 } }));
  });
  it('replies once and marks the thread replied atomically', async () => {
    tx.feedback.findUnique.mockResolvedValue({ id: 'thread', status: 'OPEN' });
    tx.feedbackReply.create.mockResolvedValue({ id: 'reply' });
    await service.reply(1, 'thread', { requestId: 'reply', message: 'Thank you.' });
    expect(tx.feedback.update).toHaveBeenCalledWith({ where: { id: 'thread' }, data: { status: 'REPLIED' } });
    tx.feedbackReply.findUnique.mockResolvedValue({ id: 'reply', adminId: 1, feedbackId: 'thread' });
    await expect(service.reply(1, 'thread', { requestId: 'reply', message: 'Thank you.' })).resolves.toEqual({
      id: 'reply',
    });
    expect(tx.feedbackReply.create).toHaveBeenCalledTimes(1);
    await expect(service.reply(2, 'other', { requestId: 'reply', message: 'Thank you.' })).rejects.toThrow(
      'Request ID already used',
    );
  });
  it('does not reply to missing or closed threads', async () => {
    await expect(service.reply(1, 'missing', { requestId: 'reply', message: 'Hi' })).rejects.toThrow('not found');
    tx.feedback.findUnique.mockResolvedValue({ status: 'CLOSED' });
    await expect(service.reply(1, 'closed', { requestId: 'reply', message: 'Hi' })).rejects.toThrow('Reopen');
    expect(tx.feedbackReply.create).not.toHaveBeenCalled();
  });
});
