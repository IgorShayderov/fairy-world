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
            gems: 20,
            experience: 0,
            level: 1,
            currentShopId: 1,
            inventory: [
              { id: 9, item: { id: 3, name: 'Shield', price: 20 }, quantity: 7 },
              { id: 10, item: { id: 4, name: 'Potion', price: 50 }, quantity: 2 },
            ],
            equippedItems: [],
          }
        : {
            id: 2,
            name: 'Armory',
            gold: 800,
            refreshCost: 10,
            items: [{ id: 3, price: 20, quantity: 10 }],
          },
    }));
    mocks.post.mockResolvedValue({ data: { success: true, quantity: 6, earnedGold: 65 } });
  });
  afterEach(() => vi.useRealTimers());

  it('loads real balances and sends all selected inventory lines in one sale', async () => {
    const shop = useShopActions();
    await shop.loadData();
    expect(shop.gold.value).toBe(120);
    expect(shop.shopGold.value).toBe(800);
    shop.sellQuantity.value[3] = 4;
    shop.sellQuantity.value[4] = 1;
    await shop.sellSelectedItems();
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/shop\/1\/sell-many$/), {
      items: [
        { itemId: 3, quantity: 4 },
        { itemId: 4, quantity: 1 },
      ],
    });
  });

  it('preserves a quantity chosen using the quantity controls', async () => {
    const shop = useShopActions();
    await shop.loadData();
    for (let count = 0; count < 5; count++) shop.adjustSell(3, 'Shield', 7, 1);
    expect(shop.sellQuantity.value[3]).toBe(5);
    expect(shop.sellItemCount()).toBe(5);
    expect(shop.sellTotal()).toBe(50);
  });

  it('blocks duplicate submissions and invalid quantities', async () => {
    const shop = useShopActions();
    await shop.loadData();
    shop.sellQuantity.value[3] = 0;
    await shop.sellSelectedItems();
    shop.sellQuantity.value[3] = 8;
    await shop.sellSelectedItems();
    expect(mocks.post).not.toHaveBeenCalled();
    shop.sellQuantity.value[3] = 4;
    await Promise.all([shop.sellSelectedItems(), shop.sellSelectedItems()]);
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('adds one item to the buy list on an icon double click without purchasing it', async () => {
    const shop = useShopActions();
    await shop.loadData();

    shop.addToCart(3);

    expect(shop.cart.value[3]).toBe(1);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('adds one item to the sell list on an inventory icon double click without selling it', async () => {
    const shop = useShopActions();
    await shop.loadData();

    shop.addOneToSell(3, 'Shield', 7);

    expect(shop.sellQuantity.value[3]).toBe(1);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('spends gems through the dedicated shop refresh request', async () => {
    const shop = useShopActions();
    await shop.loadData();

    await shop.refreshStock();

    expect(mocks.post).toHaveBeenCalledWith(expect.stringMatching(/\/shop\/1\/refresh$/));
    expect(mocks.notify).toHaveBeenCalledWith({ type: 'positive', message: 'shop.refreshSuccess' });
  });
});
