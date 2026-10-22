import { expect, test } from '@playwright/test';

// Run the isolated fixture with: npx vite --config test/battle-3d.vite.config.ts
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

for (const [weapon, enemy] of [
  ['TWO_HANDED', 'BONE_KNIGHT'],
  ['CROSSBOW', 'MINOTAUR'],
  ['BOW', 'DRAGON'],
]) {
  test(`3D ${weapon} / ${enemy}: movement, repeated defense, strikes, final blow and mid-cast cleanup`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const base = process.env.BATTLE_PREVIEW_URL ?? 'http://127.0.0.1:5190';
    await page.goto(`${base}/test/battle-3d-preview.html?enemy=${enemy}&weapon=${weapon}`);
    const action = (name: string) => page.getByRole('button', { name, exact: true });
    const ready = action('Attack exchange');
    await expect(ready).toBeEnabled({ timeout: 60_000 });
    for (const name of [
      'Advance and strike',
      'Enemy walk',
      'Defend',
      'Defend',
      'Dodge exchange',
      'Attack exchange',
      'Skill fire',
    ]) {
      await action(name).click();
      await expect(ready).toBeDisabled();
      await expect(ready).toBeEnabled({ timeout: 20_000 });
    }
    await page.screenshot({ path: `/tmp/battle-refactor-${weapon}.png` });
    await action('Final blow').click();
    await expect(ready).toBeDisabled();
    await expect(ready).toBeEnabled({ timeout: 20_000 });
    await expect(page.locator('.scene-message')).toHaveCount(0);
    // Use a fresh active encounter to cancel during the spell wind-up.
    await page.reload();
    await expect(ready).toBeEnabled({ timeout: 60_000 });
    await action('Skill fire').click();
    await action('Toggle scene').click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await action('Toggle scene').click();
    await expect(ready).toBeEnabled({ timeout: 60_000 });
    await action('Attack exchange').click();
    await expect(ready).toBeEnabled({ timeout: 20_000 });
    expect(errors).toEqual([]);
  });
}
