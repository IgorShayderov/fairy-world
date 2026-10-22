import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GEM_ACTIONS, gemActionCost, gemActionCosts, type GemAction } from './gem-prices';
import { AdminGemPricesController } from './gem-prices.controller';
import { GemPriceDto } from './gem-prices.dto';

describe('gem action prices', () => {
  const findUnique = jest.fn(),
    findMany = jest.fn(),
    upsert = jest.fn();
  const prisma = { gemActionPrice: { findUnique, findMany, upsert } } as unknown as PrismaService;
  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
  });
  it.each(Object.keys(GEM_ACTIONS) as GemAction[])(
    'uses defaults, custom prices, zero and rejects stale quotes for %s',
    async (key) => {
      expect(await gemActionCost(prisma, key)).toBe(GEM_ACTIONS[key].defaultCost);
      findUnique.mockResolvedValue({ cost: 37 });
      expect(await gemActionCost(prisma, key, 37)).toBe(37);
      await expect(gemActionCost(prisma, key, 10)).rejects.toThrow('No gems were spent');
      findUnique.mockResolvedValue({ cost: 0 });
      expect(await gemActionCost(prisma, key, 0)).toBe(0);
      expect(findUnique).toHaveBeenLastCalledWith({ where: { key } });
    },
  );
  it('lists defaults and persisted overrides, and saves only the selected key', async () => {
    const updatedAt = new Date();
    findMany.mockResolvedValue([{ key: 'SHOP_REFRESH', cost: 7, updatedAt }]);
    expect(await gemActionCosts(prisma)).toHaveLength(6);
    const result = await new AdminGemPricesController(prisma).save({ key: 'SHOP_REFRESH', cost: 7 });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'SHOP_REFRESH' },
      create: { key: 'SHOP_REFRESH', cost: 7 },
      update: { cost: 7 },
    });
    expect(result.find(({ key }) => key === 'SHOP_REFRESH')).toMatchObject({ cost: 7, defaultCost: 10, updatedAt });
    expect(result.find(({ key }) => key === 'QUEST_REFRESH')?.cost).toBe(30);
  });
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });
  it.each([-1, 1.5, 100001, null, 'abc', undefined])('rejects invalid cost %s', async (cost) => {
    await expect(
      pipe.transform({ key: 'SHOP_REFRESH', cost }, { type: 'body', metatype: GemPriceDto }),
    ).rejects.toThrow();
  });
  it('rejects unsupported actions and accepts zero and the upper bound', async () => {
    await expect(
      pipe.transform({ key: 'PREMIUM', cost: 7 }, { type: 'body', metatype: GemPriceDto }),
    ).rejects.toThrow();
    for (const cost of [0, 100000])
      await expect(
        pipe.transform({ key: 'SHOP_REFRESH', cost }, { type: 'body', metatype: GemPriceDto }),
      ).resolves.toMatchObject({ cost });
  });
});
