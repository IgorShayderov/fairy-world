import { expect, test } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });

test('premium uses the configured price, refreshes stale quotes and prices renewals', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'premium-price-test');
    localStorage.setItem('fw_settings', JSON.stringify({ sidebarExpanded: false, chatPosition: 'closed' }));
  });
  const user = {
    id: 1,
    name: 'Player',
    level: 20,
    gold: 1000,
    gems: 500,
    inventory: [],
    equippedItems: [],
    activeBuffs: [],
    attributes: [],
    properties: [],
    mapPosition: { x: 0, y: 0 },
    premium: { active: false, expiresAt: null as string | null },
  };
  let price = 350;
  const quotes: number[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/users/me')) data = user;
    else if (path.endsWith('/notifications/summary')) data = { unread: 0, pending: 0 };
    else if (path.endsWith('/game/gem-prices')) data = [{ key: 'PREMIUM_ACCOUNT', cost: price, defaultCost: 200 }];
    else if (path.endsWith('/premium/purchase')) {
      const { expectedCost } = route.request().postDataJSON() as { expectedCost: number };
      quotes.push(expectedCost);
      if (expectedCost !== price) {
        await route.fulfill({ status: 409, json: { message: 'The gem price has changed. No gems were spent.' } });
        return;
      }
      user.gems -= price;
      user.premium = { active: true, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
      data = { active: true, expiresAt: user.premium.expiresAt, gems: user.gems };
    }
    await route.fulfill({ json: { data, meta: {} } });
  });
  await page.goto('/gems');
  await expect(page.getByRole('button', { name: 'Buy premium — 350 gems' })).toBeEnabled();
  price = 400;
  await page.getByRole('button', { name: 'Buy premium — 350 gems' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buy premium — 400 gems' })).toBeEnabled();
  expect(user.gems).toBe(500);
  await page.getByRole('button', { name: 'Buy premium — 400 gems' }).click();
  await expect(page.getByRole('button', { name: 'Extend by 30 days — 400 gems' })).toBeDisabled();
  expect(quotes).toEqual([350, 400]);
  expect(user.gems).toBe(100);
});
