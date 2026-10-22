import { expect, test } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });

test('admin can work without a game login and expiry does not invoke game authentication', async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.setItem('fw_admin_token', 'adm_independent'); });
  let expired = false;
  const requests: string[] = [];
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    expect(route.request().headers().authorization).toBe('Bearer adm_independent');
    if (expired) {
      await route.fulfill({ status: 401, json: { message: 'Admin session expired or revoked' } });
      return;
    }
    const data = path.endsWith('/auth/me') ? { id: 2, name: 'Game admin', email: 'admin@example.invalid' } : { entries: [], total: 0, page: 1, pageSize: 20 };
    await route.fulfill({ json: { data, meta: {} } });
  });
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Admin log out' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
  expired = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Admin session expired or revoked');
  expect(await page.evaluate(() => sessionStorage.getItem('fw_admin_token'))).toBeNull();
  expect(requests.every(path => path.includes('/admin/'))).toBe(true);
  await expect(page).toHaveURL(/\/admin$/);
});

for (const width of [1440, 390]) {
  test(`player feedback and separate admin replies at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'game-token');
      localStorage.setItem('fw_settings', JSON.stringify({ sidebarExpanded: false, chatPosition: 'closed' }));
    });
    const user = { id: 1, name: 'Player', level: 20, gold: 1000, gems: 0, currentShopId: null, inventory: [], equippedItems: [], activeBuffs: [], attributes: [], properties: [], mapPosition: { x: 0, y: 0 } };
    let sent = false, status = 'OPEN';
    const replies: Array<{ id: string; message: string; createdAt: string; admin: { name: string } }> = [];
    const entry = () => ({ id: 'thread', category: 'EXPERIENCE', rating: 4, message: 'I love exploring but the quests could be clearer.', status, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), user: { name: 'Player' }, _count: { replies: replies.length }, replies });
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      let data: unknown = [];
      if (path.endsWith('/users/me')) data = user;
      else if (path.endsWith('/notifications/summary')) data = { unread: 0, pending: 0 };
      else if (path.includes('/admin/')) {
        if (path.endsWith('/auth/login')) {
          expect(route.request().headers().authorization).toBeUndefined();
          data = { token: 'adm_test-session', expiresAt: new Date(Date.now() + 3600000).toISOString(), admin: { id: 2, name: 'Game admin', email: 'admin@example.invalid' } };
        } else {
          expect(route.request().headers().authorization).toBe('Bearer adm_test-session');
          if (path.endsWith('/auth/me')) data = { id: 2, name: 'Game admin', email: 'admin@example.invalid' };
          else if (path.endsWith('/auth/logout')) data = { success: true };
          else if (path.endsWith('/replies')) {
            const body = route.request().postDataJSON() as { message: string; requestId: string };
            expect(body.requestId).toBeTruthy();
            replies.push({ id: 'reply', message: body.message, createdAt: new Date().toISOString(), admin: { name: 'Game admin' } });
            status = 'REPLIED'; data = { id: 'reply' };
          } else if (path.endsWith('/status')) { status = (route.request().postDataJSON() as { status: string }).status; data = { success: true }; }
          else if (path.endsWith('/feedback')) data = { entries: sent ? [entry()] : [], total: sent ? 1 : 0, page: 1, pageSize: 20 };
          else data = entry();
        }
      } else if (path.endsWith('/feedback') && method === 'POST') {
        expect(route.request().headers().authorization).toBe('Bearer game-token');
        expect(route.request().postDataJSON()).toMatchObject({ message: entry().message, category: 'EXPERIENCE', rating: 4 });
        sent = true; data = { id: 'thread' };
      } else if (path.endsWith('/feedback')) data = { entries: sent ? [entry()] : [], total: sent ? 1 : 0, page: 1, pageSize: 20 };
      else if (path.endsWith('/feedback/thread')) data = entry();
      await route.fulfill({ json: { data, meta: {} } });
    });
    await page.goto('/auction');
    await page.getByRole('button', { name: 'Feedback', exact: true }).click();
    await page.getByLabel('Your feedback').fill(entry().message);
    await page.getByLabel('Experience rating (optional)').selectOption('4');
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Your feedback was sent');
    await page.getByRole('button', { name: 'My feedback', exact: true }).click();
    await page.getByRole('button').filter({ hasText: entry().message }).click();
    await expect(page.getByText('No reply yet. Your feedback has been received.')).toBeVisible();
    await page.screenshot({ path: `/tmp/feedback-player-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Close feedback', exact: true }).click();
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
    await page.getByLabel('Email', { exact: true }).fill('admin@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in to admin' }).click();
    await expect(page.getByRole('button', { name: 'Admin log out' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBe('game-token');
    expect(await page.evaluate(() => sessionStorage.getItem('fw_admin_token'))).toBe('adm_test-session');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Admin log out' })).toBeVisible();
    await page.getByRole('button').filter({ hasText: entry().message }).click();
    await page.getByLabel('Reply to player').fill('Thanks! We will improve the quest descriptions.');
    await page.getByRole('button', { name: 'Send reply', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Reply sent to the player.');
    await expect(page.getByRole('heading', { name: 'Admin replies (1)' })).toBeVisible();
    await page.getByRole('button', { name: 'Close feedback', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reopen feedback' })).toBeVisible();
    await expect(page.getByLabel('Reply to player')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reopen feedback' }).click();
    await expect(page.getByLabel('Reply to player')).toBeVisible();
    expect(await page.locator('.admin-page').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/feedback-admin-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Admin log out' }).click();
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBe('game-token');
    expect(await page.evaluate(() => sessionStorage.getItem('fw_admin_token'))).toBeNull();
    await page.goto('/auction');
    await page.getByRole('button', { name: 'Feedback', exact: true }).click();
    await page.getByRole('button', { name: 'My feedback', exact: true }).click();
    await page.getByRole('button').filter({ hasText: entry().message }).click();
    await expect(page.getByText('Thanks! We will improve the quest descriptions.', { exact: true })).toBeVisible();
  });
}
