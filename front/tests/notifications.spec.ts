import { expect, test } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });

for (const width of [1440, 390]) {
  test(`header notification drawer supports claims and keyboard dismissal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'notification-ui-test');
      localStorage.setItem('fw_settings', JSON.stringify({ sidebarExpanded: false, chatPosition: 'closed' }));
    });
    let read = false;
    let claimed = false;
    let claimAttempts = 0;
    let inboxRequests = 0;
    const user = {
      id: 1, name: 'Traveller', level: 20, gold: 1000, gems: 0, currentShopId: null,
      inventory: [], equippedItems: [], activeBuffs: [], attributes: [], properties: [], craftInventory: [],
      mapPosition: { x: 0, y: 0 },
    };
    const listing = {
      id: 'listing', quantity: 1, price: 250, upgradeType: 'DAMAGE', upgradeValue: 8, sellerName: 'Traveller', isMine: true,
      item: { id: 101, name: 'Runed Crossbow', rarity: 'RARE', icon: 'icon_crossbow.svg', level: 13, requiredPlayerLevel: 10, equipmentType: ['WEAPON'], attributes: [], properties: [{ name: 'DAMAGE', value: 24 }] },
      expiresAt: new Date().toISOString(), claimExpiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
    };
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path.endsWith('/users/me')) data = user;
      else if (path.endsWith('/notifications/summary')) data = { unread: read || claimed ? 0 : 1, pending: claimed ? 0 : 1 };
      else if (path.endsWith('/notifications')) {
        inboxRequests++;
        data = {
          notifications: [{ id: 'note', kind: claimed ? 'AUCTION_RETURNED' : 'AUCTION_RETURN_PENDING', readAt: read || claimed ? new Date().toISOString() : null, createdAt: new Date().toISOString(), listing: { ...listing, status: claimed ? 'RETURNED' : 'RETURN_PENDING' } }],
          total: 1, page: 1, pageSize: 24, serverTime: new Date().toISOString(),
        };
      } else if (path.endsWith('/read')) { read = true; data = { success: true }; }
      else if (path.endsWith('/claim')) {
        claimAttempts++;
        if (claimAttempts === 1) {
          await route.fulfill({ status: 400, json: { statusCode: 400, message: 'Your inventory is full. Free a slot and try again before the deadline' } });
          return;
        }
        claimed = true;
        data = { success: true };
      }
      await route.fulfill({ json: { data, meta: {} } });
    });
    await page.goto('/auction');
    await expect(page.getByText('Visit a town to use the auction house.', { exact: true })).toBeVisible();
    await expect(page.locator('.realm-menu-scroll').getByText('Notifications', { exact: true })).toHaveCount(0);
    const bell = page.getByRole('button', { name: 'Notifications', exact: true });
    await expect(bell).toBeVisible();
    await expect(bell.locator('.notification-badge')).toHaveText('1');
    expect(inboxRequests).toBe(0);
    await bell.click();
    const drawer = page.locator('#notification-drawer');
    await expect(drawer).toBeVisible();
    await expect(bell).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.getByRole('heading', { name: 'Item waiting to be claimed' })).toBeVisible();
    expect(read).toBe(false);
    expect(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await drawer.locator('.auction-page').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect.poll(async () => {
      const box = await drawer.boundingBox();
      return !!box && Math.abs(box.x + box.width - width) < 1 && box.y === 0 && box.height === 800;
    }).toBe(true);
    await page.screenshot({ path: `/tmp/notifications-drawer-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(bell).toBeFocused();
    await bell.click();
    await drawer.getByRole('button', { name: 'Mark as read' }).click();
    await expect(drawer.getByRole('button', { name: 'Mark as read' })).toHaveCount(0);
    await expect(bell.locator('.notification-badge')).toHaveText('1');
    await drawer.getByRole('button', { name: 'Move to inventory' }).click();
    await expect(drawer.getByRole('alert')).toContainText('Your inventory is full');
    await expect(drawer.getByRole('button', { name: 'Move to inventory' })).toBeEnabled();
    await drawer.getByRole('button', { name: 'Move to inventory' }).click();
    await expect(drawer.getByRole('status')).toHaveText('Item moved to your inventory.');
    await expect(bell.locator('.notification-badge')).toHaveCount(0);
    await expect(drawer.getByRole('button', { name: 'Move to inventory' })).toHaveCount(0);
    await drawer.getByRole('button', { name: 'Close notifications' }).click();
    await expect(drawer).not.toBeVisible();
    await expect(page).toHaveURL(/\/auction$/);
  });
}
