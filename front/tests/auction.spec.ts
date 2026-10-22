import { expect, test } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });
for (const width of [1440, 700]) {
  test(`auction selling, buying and return inbox at width ${width}`, async ({ page }) => {
    page.on('pageerror', error => console.error('Auction browser error:', error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'auction-ui-test');
      localStorage.setItem('fw_settings', JSON.stringify({ sidebarExpanded: false, chatPosition: 'closed' }));
    });
    const item = { id: 101, name: 'Runed Crossbow', rarity: 'RARE', icon: 'icon_crossbow.svg', level: 13, requiredPlayerLevel: 10, equipmentType: ['WEAPON'], description: 'A finely crafted crossbow', price: 50, attributes: [], properties: [{ name: 'DAMAGE', value: 24, description: null }] };
    const ownedItem = { id: 77, item: { ...item, name: 'Knight Crossbow' }, quantity: 2, isEquiped: false, slot: null, upgradeType: 'DAMAGE', upgradeValue: 8 };
    const user = { id: 1, name: 'Trader', level: 10, gold: 1000, gems: 0, currentShopId: 1 as number | null, inventory: [ownedItem], equippedItems: [], activeBuffs: [], attributes: [], properties: [], craftInventory: [], mapPosition: { x: 1470, y: 960 } };
    const sale = { id: '00000000-0000-4000-8000-000000000001', item, quantity: 1, price: 250, upgradeType: null, upgradeValue: null, status: 'ACTIVE', expiresAt: new Date(Date.now() + 3600000).toISOString(), sellerName: 'Other player', isMine: false, claimExpiresAt: null };
    const highLevel = { ...sale, id: 'high', item: { ...item, name: 'Legendary Staff', requiredPlayerLevel: 30 } };
    let bought = false, listed = false, claimed = false, read = false;
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      let data: unknown = [];
      if (path.endsWith('/users/me')) data = user;
      else if (path.endsWith('/battle/active')) data = null;
      else if (path.endsWith('/notifications/summary')) data = { unread: read || claimed ? 0 : 1, pending: claimed ? 0 : 1 };
      else if (path.endsWith('/auction') && route.request().method() === 'POST') {
        expect(route.request().postDataJSON()).toMatchObject({ inventoryItemId: 77, quantity: 1, price: 333, durationHours: 24 });
        listed = true; user.inventory[0]!.quantity = 1; data = { success: true, listingId: 'new' };
      } else if (path.endsWith('/auction')) data = { listings: url.searchParams.get('view') === 'mine' ? listed ? [{ ...sale, id: 'new', isMine: true, sellerName: 'Trader', item: ownedItem.item, price: 333 }] : [] : bought ? [highLevel] : [sale, highLevel], total: 2, page: 1, pageSize: 24, serverTime: new Date().toISOString() };
      else if (path.endsWith('/buy')) { bought = true; user.gold -= 250; data = { success: true }; }
      else if (path.endsWith('/notifications')) data = { notifications: [{ id: 'note', kind: claimed ? 'AUCTION_RETURNED' : 'AUCTION_RETURN_PENDING', readAt: read || claimed ? new Date().toISOString() : null, createdAt: new Date().toISOString(), listing: { ...sale, isMine: true, item: ownedItem.item, status: claimed ? 'RETURNED' : 'RETURN_PENDING', claimExpiresAt: new Date(Date.now() + 6 * 86400000).toISOString() } }], total: 1, page: 1, pageSize: 24, serverTime: new Date().toISOString() };
      else if (path.endsWith('/claim')) { claimed = true; data = { success: true }; }
      else if (path.endsWith('/read')) { read = true; data = { success: true }; }
      await route.fulfill({ json: { data, meta: {} } });
    });
    await page.goto('/auction');
    await expect(page.getByRole('heading', { name: 'Auction house', exact: true })).toBeVisible();
    await expect(page.locator('.realm-menu-scroll a[href="/auction"], .realm-menu-scroll a[href="/shop"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Requires level 30' })).toBeDisabled();
    await page.locator('.auction-page').screenshot({ path: `/tmp/auction-${width}.png` });
    await page.getByRole('button', { name: 'Buy item', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm purchase', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Purchase complete');
    expect(bought).toBe(true);
    await expect(page.locator('.auction-balance')).toContainText('750 gold');
    await page.getByRole('button', { name: 'Sell an item', exact: true }).click();
    await page.getByLabel('Inventory item').selectOption('77');
    await page.getByLabel('Total price (gold)').fill('333');
    await page.getByLabel('Listing duration').selectOption('24');
    await page.getByRole('button', { name: 'List item', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('now listed');
    expect(listed).toBe(true);
    await expect(page.getByText('333 gold', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Notifications', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Item waiting to be claimed' })).toBeVisible();
    await page.locator('.auction-page').screenshot({ path: `/tmp/auction-inbox-${width}.png` });
    await page.getByRole('button', { name: 'Mark as read' }).click();
    await expect(page.getByRole('button', { name: 'Mark as read' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Move to inventory' })).toBeVisible();
    await page.getByRole('button', { name: 'Move to inventory' }).click();
    await expect(page.getByRole('status')).toHaveText('Item moved to your inventory.');
    expect(claimed).toBe(true);
    await expect(page.getByRole('button', { name: 'Move to inventory' })).toHaveCount(0);
    expect(await page.locator('.auction-page').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.goto('/');
    await page.locator('canvas').click();
    const town = page.getByRole('dialog', { name: 'EVERCROSS' });
    await expect(town.getByRole('button', { name: /Visit the market/i })).toBeVisible();
    await town.getByRole('button', { name: /auction/i }).click();
    await expect(page).toHaveURL(/\/auction$/);
    await expect(page.getByRole('button', { name: 'Sell an item', exact: true })).toBeVisible();
    user.currentShopId = null;
    user.mapPosition = { x: 0, y: 0 };
    await page.reload();
    await expect(page.getByText('Visit a town to use the auction house.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sell an item', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Return to map', exact: true })).toBeVisible();
  });
}
