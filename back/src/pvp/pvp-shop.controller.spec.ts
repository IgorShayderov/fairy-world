import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { PvpShopController } from './pvp-shop.controller';
import { PvpShopService } from './pvp-shop.service';

describe('PvpShopController', () => {
  let controller: PvpShopController;
  const pvpShopService = { getShop: jest.fn(), buy: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PvpShopController],
      providers: [{ provide: PvpShopService, useValue: pvpShopService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(PvpShopController);
  });

  it('returns the current player shop', async () => {
    pvpShopService.getShop.mockResolvedValue({ offers: [] });
    await expect(controller.getShop({ user: { sub: 42 } } as never)).resolves.toEqual({ offers: [] });
    expect(pvpShopService.getShop).toHaveBeenCalledWith(42);
  });

  it('buys only the requested server-side offer', async () => {
    pvpShopService.buy.mockResolvedValue({ success: true });
    await expect(controller.buy({ user: { sub: 42 } } as never, { offerId: 'potion:7' })).resolves.toEqual({
      success: true,
    });
    expect(pvpShopService.buy).toHaveBeenCalledWith(42, 'potion:7');
  });
});
