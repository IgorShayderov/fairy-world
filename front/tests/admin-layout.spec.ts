import { expect, test } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });

for (const width of [1440, 900, 390]) {
  test(`admin toolbar and empty panels align at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(() => sessionStorage.setItem('fw_admin_token', 'adm_layout-preview'));
    await page.route('**/api/v1/admin/**', async (route) => {
      const data = route.request().url().endsWith('/auth/me')
        ? { id: 1, name: 'Admin', email: 'admin@example.invalid' }
        : { entries: [], total: 0, page: 1, pageSize: 20 };
      await route.fulfill({ json: { data, meta: {} } });
    });
    await page.goto('/admin');
    await expect(page.getByText('No feedback in this view.')).toBeVisible();
    const bounds = await page.locator('.admin-page').evaluate((root) => {
      const box = (selector: string) => root.querySelector(selector)!.getBoundingClientRect().toJSON();
      return {
        select: box('.admin-toolbar select'),
        refresh: box('.admin-toolbar > button'),
        count: box('.admin-submission-count'),
        list: box('.admin-submissions'),
        detail: box('.admin-thread'),
        overflow: root.scrollWidth > root.clientWidth,
      };
    });
    expect(Math.abs(bounds.select.top - bounds.refresh.top)).toBeLessThan(1);
    expect(Math.abs(bounds.select.bottom - bounds.refresh.bottom)).toBeLessThan(1);
    expect(bounds.overflow).toBe(false);
    if (width > 800) {
      expect(Math.abs(bounds.list.top - bounds.detail.top)).toBeLessThan(1);
      expect(Math.abs(bounds.list.height - bounds.detail.height)).toBeLessThan(1);
      expect(Math.abs(bounds.count.bottom - bounds.select.bottom)).toBeLessThan(1);
    } else {
      expect(bounds.detail.top).toBeGreaterThanOrEqual(bounds.list.bottom);
      expect(bounds.count.top).toBeGreaterThanOrEqual(bounds.select.bottom);
    }
    await page.screenshot({ path: `/tmp/admin-layout-${width}.png` });
  });
}
