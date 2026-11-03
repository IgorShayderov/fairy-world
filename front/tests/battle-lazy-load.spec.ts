import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

test('loads the 3D renderer only after choosing tactical combat', async ({ page }) => {
  test.setTimeout(90_000);
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5193/test/dungeon-preview.html?standard=1');
  const start = page.getByRole('button', { name: 'Tactical battle', exact: true });
  await expect(start).toBeVisible();
  expect(requests.some((url) => url.includes('Battlefield3D.vue'))).toBe(false);
  await start.click();
  await expect(page.locator('.tactical-battlefield canvas')).toBeVisible({ timeout: 60_000 });
  expect(requests.some((url) => url.includes('Battlefield3D.vue'))).toBe(true);
  expect(errors).toEqual([]);
});
