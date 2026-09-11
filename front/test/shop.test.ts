import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), notify: vi.fn() }));
vi.mock('@/shared/api', () => ({ api: { get: mocks.get, post: mocks.post } }));
vi.mock('quasar', () => ({ useQuasar: () => ({ notify: mocks.notify }) }));
vi.mock('i18next-vue', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useShopActions } from '@/modules/Shop/composables/useShopActions';

describe('shop quantity requests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.get.mockImplementation((url: string) => ({
      data: url.endsWith('/users/me')
        ? {
            id: 5,
            name: 'Player',
            email: 'player@example.com',
            gold: 120,
            experience: 0,
            level: 1,
            inventory: [{ id: 9, item: { id: 3, name: 'Shield' }, quantity: 7 }],
          }
        : {
            id: 2,
            name: 'Armory',
            gold: 800,
            items: [{ id: 3, price: 20, quantity: 10 }],
          },
    }));
    mocks.post.mockResolvedValue({ data: { success: true, quantity: 4, earnedGold: 40 } });
  });
  afterEach(() => vi.useRealTimers());

  it('loads real balances and sends four selected items, not one', async () => {
    const shop = useShopActions();
    await shop.loadData();
    expect(shop.gold.value).toBe(120);
    expect(shop.shopGold.value).toBe(800);
    shop.sellQuantity.value[3] = 4;
    await shop.sellFromInventory(3, 'Shield', shop.sellQuantity.value[3]);
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/shop\/1\/sell$/), {
      itemId: 3,
      quantity: 4,
    });
  });

  it('preserves a quantity chosen using the minus controls', async () => {
    const shop = useShopActions();
    await shop.loadData();
    shop.adjustSell(3, 'Shield', 7, -1);
    shop.adjustSell(3, 'Shield', 7, -1);
    expect(shop.sellQuantity.value[3]).toBe(5);
    await shop.sellFromInventory(3, 'Shield', shop.sellQuantity.value[3]!);
    expect(mocks.post).toHaveBeenCalledWith(expect.stringMatching(/\/sell$/), { itemId: 3, quantity: 5 });
  });

  it('blocks duplicate submissions and invalid quantities', async () => {
    const shop = useShopActions();
    await shop.loadData();
    await shop.sellFromInventory(3, 'Shield', 0);
    await shop.sellFromInventory(3, 'Shield', 8);
    expect(mocks.post).not.toHaveBeenCalled();
    await Promise.all([shop.sellFromInventory(3, 'Shield', 4), shop.sellFromInventory(3, 'Shield', 4)]);
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('buys one item immediately on an icon double click', async () => {
    const shop = useShopActions();
    await shop.loadData();

    await shop.buyImmediately(3);

    expect(mocks.post).toHaveBeenCalledWith(expect.stringMatching(/\/shop\/1\/buy$/), {
      itemId: 3,
      quantity: 1,
    });
  });

  it('sells one item immediately on an inventory icon double click', async () => {
    const shop = useShopActions();
    await shop.loadData();

    await shop.sellOneFromInventory(3, 'Shield');

    expect(mocks.post).toHaveBeenCalledWith(expect.stringMatching(/\/shop\/1\/sell$/), {
      itemId: 3,
      quantity: 1,
    });
  });
});
