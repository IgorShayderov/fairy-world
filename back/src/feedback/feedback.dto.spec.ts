import { ValidationPipe } from '@nestjs/common';
import { FeedbackDto, FeedbackQueryDto, AdminLoginDto, ReplyDto } from './feedback.dto';

describe('feedback validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const input = {
    requestId: '00000000-0000-4000-8000-000000000001',
    category: 'EXPERIENCE',
    message: '  I enjoy the game very much.  ',
    rating: 5,
  };
  it('trims submitted feedback and parses URL pagination', async () => {
    await expect(pipe.transform(input, { type: 'body', metatype: FeedbackDto })).resolves.toMatchObject({
      message: 'I enjoy the game very much.',
    });
    await expect(
      pipe.transform({ page: '2', status: 'OPEN' }, { type: 'query', metatype: FeedbackQueryDto }),
    ).resolves.toEqual({ page: 2, status: 'OPEN' });
  });
  it.each([
    { message: '          ' },
    { message: 'x'.repeat(5001) },
    { rating: 6 },
    { rating: 0 },
    { category: 'UNKNOWN' },
    { userId: 2 },
    { status: 'CLOSED' },
    { requestId: 'bad' },
  ])('rejects invalid or forged submission %j', async (fields) => {
    await expect(pipe.transform({ ...input, ...fields }, { type: 'body', metatype: FeedbackDto })).rejects.toThrow();
  });
  it('rejects empty replies, malformed login and invalid pages', async () => {
    await expect(
      pipe.transform({ requestId: input.requestId, message: '   ' }, { type: 'body', metatype: ReplyDto }),
    ).rejects.toThrow();
    await expect(
      pipe.transform({ email: 'invalid', password: '' }, { type: 'body', metatype: AdminLoginDto }),
    ).rejects.toThrow();
    for (const page of ['bad', '0', '1.5'])
      await expect(pipe.transform({ page }, { type: 'query', metatype: FeedbackQueryDto })).rejects.toThrow();
  });
});
