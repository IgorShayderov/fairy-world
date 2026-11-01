import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.setTimeout(120_000);

for (const width of [1024, 1440]) {
  test(`status badges wrap above the enemy HP bar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('http://127.0.0.1:5193/test/dungeon-preview.html?standard=1&statusBadges=1');
    await page.getByRole('button', { name: 'Tactical battle', exact: true }).click();
    const panel = page.locator('.tactical-stat--monster');
    const badges = panel.locator('.status-badges');
    await expect(badges).toBeVisible();
    await expect(badges.locator('span')).toHaveCount(3);
    const container = await badges.boundingBox();
    const bar = await panel.locator('.vital-bar').boundingBox();
    expect(container!.y + container!.height).toBeLessThanOrEqual(bar!.y);
    for (const badge of await badges.locator('span').all()) {
      const bounds = await badge.boundingBox();
      expect(bounds!.height).toBeGreaterThan(15);
      expect(bounds!.y).toBeGreaterThanOrEqual(container!.y);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(container!.y + container!.height + 1);
      expect(await badge.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await page.screenshot({ path: `/tmp/enemy-status-${width}.png`, clip: (await panel.boundingBox())! });
  });
}

test('enemy without effects has only its actual HP bar', async ({ page }) => {
  await page.goto('http://127.0.0.1:5193/test/dungeon-preview.html?standard=1');
  await page.getByRole('button', { name: 'Tactical battle', exact: true }).click();
  const panel = page.locator('.tactical-stat--monster');
  await expect(panel.locator('.status-badges')).toHaveCount(0);
  await expect(panel.locator('.vital-bar')).toHaveCount(1);
});
