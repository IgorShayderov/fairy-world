import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://localhost:9001' });

test('language changes immediately and persists across reloads', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'settings-test');
    if (!localStorage.getItem('fw_settings')) localStorage.setItem('fw_settings', JSON.stringify({ chatPosition: 'closed', sidebarExpanded: true }));
  });
  await page.route('**/api/v1/**', async (route) => {
    const data = route.request().url().includes('/users/me') ? { id: 1, name: 'Player', level: 1, inventory: [], equippedItems: [], activeBuffs: [], attributes: [], properties: [] } : [];
    await route.fulfill({ json: { data, meta: {} } });
  });
  await page.goto('/profile');
  await page.getByText('Settings', { exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('radio', { name: 'English' })).toBeChecked();
  await page.getByRole('radio', { name: 'Русский' }).check();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Русский' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.getByRole('radio', { name: 'English' }).check();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'English' })).toBeChecked();
});
