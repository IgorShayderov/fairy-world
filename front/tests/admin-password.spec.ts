import { expect, test } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });

for (const width of [1440, 390]) {
  test(`admin password visibility toggle at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let submissions = 0;
    await page.route('**/api/v1/admin/auth/login', async (route) => {
      submissions++;
      await route.fulfill({ status: 401, json: { message: 'Invalid credentials' } });
    });
    await page.goto('/admin');
    const password = page.getByLabel('Password', { exact: true });
    await page.getByLabel('Email', { exact: true }).fill('admin@example.invalid');
    await password.fill('test-password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue('test-password');
    const hide = page.getByRole('button', { name: 'Hide password', exact: true });
    await expect(hide).toHaveAttribute('aria-pressed', 'true');
    await hide.press('Space');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue('test-password');
    expect(submissions).toBe(0);
    // Exercise the browser's autofill pseudo-class without storing credentials.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    for (const selector of ['.admin-login input[type=email]', '#admin-password']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['autofill'] });
      const colors = await page.locator(selector).evaluate((input) => {
        const style = getComputedStyle(input);
        return { shadow: style.boxShadow, text: style.webkitTextFillColor };
      });
      expect(colors.shadow).toContain('rgb(6, 25, 34)');
      expect(colors.text).toBe('rgb(225, 235, 229)');
    }
    await page.screenshot({ path: `/tmp/admin-password-${width}.png` });
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in to admin' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
    await expect(password).toHaveAttribute('type', 'password');
    expect(submissions).toBe(1);
  });
}
