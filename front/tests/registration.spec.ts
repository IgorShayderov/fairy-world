import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://localhost:9001' });

test('registration passwords can be revealed independently without submitting', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/v1/**', async (route) => {
    requests++;
    await route.fulfill({ json: { data: {}, meta: {} } });
  });
  await page.goto('/register');
  const password = page.locator('input[name="password"]');
  const confirmation = page.locator('input[name="password-confirm"]');
  await password.fill('FairyWorld2026!Hero');
  await confirmation.fill('FairyWorld2026!Hero');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(confirmation).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(confirmation).toHaveAttribute('type', 'password');
  const toggle = page.getByRole('button', { name: 'Show password confirmation', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(confirmation).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Hide password confirmation', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(confirmation).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('FairyWorld2026!Hero');
  await expect(confirmation).toHaveValue('FairyWorld2026!Hero');
  expect(requests).toBe(0);
});
