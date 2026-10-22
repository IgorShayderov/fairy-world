import { expect, test } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });

for (const width of [1440, 390]) {
  test(`admin edits gem prices and reloads saved values at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => sessionStorage.setItem('fw_admin_token', 'adm_price-preview'));
    const prices = [
      { key: 'PREMIUM_ACCOUNT', label: 'Premium account (30 days)', defaultCost: 200, cost: 200 },
      { key: 'SHOP_REFRESH', label: 'Refresh shop stock', defaultCost: 10, cost: 10 },
      { key: 'QUEST_REFRESH', label: 'Refresh town quests', defaultCost: 30, cost: 30 },
      { key: 'PVP_REFRESH', label: 'Refresh PvP opponents', defaultCost: 30, cost: 30 },
      { key: 'PVP_COOLDOWN', label: 'Skip PvP attack cooldown', defaultCost: 10, cost: 10 },
      { key: 'DUNGEON_COOLDOWN', label: 'Skip dungeon entry cooldown', defaultCost: 10, cost: 10 },
    ];
    const saves: Array<{ key: string; cost: number }> = [];
    let failSave = false;
    await page.route('**/api/v1/admin/**', async (route) => {
      const req = route.request();
      if (req.url().endsWith('/gem-prices')) {
        expect(req.headers().authorization).toBe('Bearer adm_price-preview');
        if (req.method() === 'POST') {
          if (failSave) {
            await route.fulfill({ status: 500, json: { message: 'Could not save prices.' } });
            return;
          }
          const body = req.postDataJSON() as { key: string; cost: number };
          saves.push(body);
          prices.find(({ key }) => key === body.key)!.cost = body.cost;
        }
        await route.fulfill({ json: { data: prices, meta: {} } });
        return;
      }
      await route.fulfill({
        json: {
          data: req.url().endsWith('/auth/me')
            ? { id: 1, name: 'Admin', email: 'admin@example.invalid' }
            : { entries: [], total: 0, page: 1, pageSize: 20 },
          meta: {},
        },
      });
    });
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Gem prices', exact: true }).click();
    const shop = page.getByLabel('Refresh shop stock price in gems');
    const quests = page.getByLabel('Refresh town quests price in gems');
    const shopForm = page.locator('form').filter({ has: shop });
    await expect(shop).toHaveValue('10');
    const premium = page.getByLabel('Premium account (30 days) price in gems');
    await expect(premium).toHaveValue('200');
    await premium.fill('350');
    await page.locator('form').filter({ has: premium }).getByRole('button', { name: 'Save price' }).click();
    await expect(page.getByRole('status')).toContainText('saved at 350 gems');
    expect(saves.pop()).toEqual({ key: 'PREMIUM_ACCOUNT', cost: 350 });
    await quests.fill('45'); // unrelated unsaved edits survive saving another action
    await shop.fill('17');
    await shopForm.getByRole('button', { name: 'Save price' }).click();
    await expect(page.getByRole('status')).toContainText('saved at 17 gems');
    await expect(quests).toHaveValue('45');
    expect(saves).toEqual([{ key: 'SHOP_REFRESH', cost: 17 }]);
    await shop.fill('-1');
    await shopForm.getByRole('button', { name: 'Save price' }).click();
    expect(await shop.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    expect(saves).toHaveLength(1);
    await shop.fill('0');
    await shopForm.getByRole('button', { name: 'Save price' }).click();
    await expect(page.getByRole('status')).toContainText('saved at 0 gems');
    await page.reload();
    await page.getByRole('button', { name: 'Gem prices', exact: true }).click();
    await expect(shop).toHaveValue('0');
    await expect(premium).toHaveValue('350');
    await expect(quests).toHaveValue('30');
    failSave = true;
    await shop.fill('21');
    await shopForm.getByRole('button', { name: 'Save price' }).click();
    await expect(page.getByRole('alert')).toContainText('Could not save prices');
    await expect(shopForm).toContainText('Current: 0 gems');
    expect(saves).toHaveLength(2);
    expect(await page.locator('.admin-page').evaluate((root) => root.scrollWidth > root.clientWidth)).toBe(false);
    await page.screenshot({ path: `/tmp/admin-gem-prices-${width}.png`, fullPage: true });
  });
}
