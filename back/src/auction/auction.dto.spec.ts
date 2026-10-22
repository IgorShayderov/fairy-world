import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { AuctionQueryDto, CreateAuctionDto } from './auction.dto';

describe('auction request validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });
  it.each([{ page: '1', view: 'market' }, { page: '2', view: 'mine' }, { page: '1' }])(
    'accepts URL query parameters %j through the application validation pipe',
    async (query) => {
      const result: unknown = await pipe.transform(query, { type: 'query', metatype: AuctionQueryDto });
      expect(result).toEqual({ page: Number(query.page), view: query.view ?? 'market' });
    },
  );
  it.each(['0', '-1', '1.5', 'abc', '1000001'])('rejects invalid URL page %s', async (page) => {
    await expect(pipe.transform({ page }, { type: 'query', metatype: AuctionQueryDto })).rejects.toThrow();
  });
  const input = {
    requestId: '00000000-0000-4000-8000-000000000001',
    inventoryItemId: 1,
    quantity: 1,
    price: 100,
    durationHours: 24,
  };
  it('accepts the duration boundaries', async () => {
    for (const durationHours of [1, 24]) {
      expect(await validate(plainToInstance(CreateAuctionDto, { ...input, durationHours }))).toHaveLength(0);
    }
  });
  it.each([
    { requestId: 'bad' },
    { inventoryItemId: -1 },
    { quantity: 0 },
    { price: 0 },
    { durationHours: 25 },
    { durationHours: 1.5 },
  ])('rejects malformed input %j', async (fields) => {
    expect((await validate(plainToInstance(CreateAuctionDto, { ...input, ...fields }))).length).toBeGreaterThan(0);
  });
  it('defaults to public listings and rejects invalid pagination or views', async () => {
    const query = plainToInstance(AuctionQueryDto, {});
    expect(query).toEqual({ page: 1, view: 'market' });
    expect(await validate(query)).toHaveLength(0);
    expect((await validate(plainToInstance(AuctionQueryDto, { page: -1, view: 'other-user' }))).length).toBe(2);
  });
});
