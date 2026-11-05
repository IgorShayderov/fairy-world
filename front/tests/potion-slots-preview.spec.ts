import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:5193/test/dungeon-preview.html?profile=1';
test.use({ viewport: { width: 1440, height: 800 } });
test.setTimeout(120_000);

test('buffs sit beside inventory and every potion slot fits on a notebook screen', async ({ page }) => {
  await page.goto(base + '&buffs=1&premium=1');
  const buffs = page.getByRole('region', { name: 'Active buffs' });
  await expect(buffs).toBeInViewport();
  await expect(buffs.getByRole('button')).toHaveCount(1);
  const bounds = await buffs.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(800);
  const panels = await page.locator('.profile-panels').boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThan(panels!.x);
  expect(Math.abs(bounds!.y - panels!.y)).toBeLessThan(2);
  for (const slot of await page.locator('.potion-use').all()) {
    await expect(slot).toBeInViewport({ ratio: 1 });
  }
  expect(await page.locator('.profile-page').evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
  await page.screenshot({ path: '/tmp/profile-active-buffs.png' });
});

test('picker stays within the viewport and assigns exactly one potion', async ({ page }) => {
  await page.goto(base);
  const slot = page.getByRole('button', { name: 'Configure potion slot 1', exact: true });
  await slot.click();
  const picker = page.locator('.potion-picker');
  await expect(picker).toBeVisible();
  const bounds = await picker.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(800);
  await expect(picker.getByRole('button', { name: /Attack Potion/ })).toHaveCount(0);
  await picker.getByRole('button', { name: /Minor Health Potion/ }).click();
  await expect(slot).toContainText('Minor Health Potion');
  await expect(picker).toHaveCount(0);
  await slot.click();
  await expect(picker.getByRole('button', { name: /Minor Health Potion/ })).toContainText('1 in backpack');
  await picker.getByRole('button', { name: 'Return potion to backpack' }).click();
  await expect(slot).toContainText('Add potion');
  await slot.click();
  await expect(picker.getByRole('button', { name: /Minor Health Potion/ })).toContainText('2 in backpack');
  await page.screenshot({ path: '/tmp/potion-picker-visible.png' });
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(slot).toBeFocused();
});

for (const size of [{ width: 1440, height: 800 }, { width: 1728, height: 900 }]) {
  test(`filled premium slots fit at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(base + '&premium=1&filledSlots=1');
    await expect(page.locator('.potion-use')).toHaveCount(8);
    for (const slot of await page.locator('.potion-use').all()) {
      await expect(slot).toContainText('Medium Health Potion');
      await expect(slot).toBeInViewport({ ratio: 1 });
    }
    expect(await page.locator('.profile-page').evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
    await page.screenshot({ path: `/tmp/profile-laptop-${size.width}.png` });
  });
}

test('inventory potion drag fills a slot without opening the picker', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(base);
  const slot = page.getByRole('button', { name: 'Configure potion slot 2', exact: true });
  // The real inventory item drag handler supplies the inventory row ID.
  const potion = page.locator('[draggable="true"]').filter({ hasText: '×2' }).first();
  await expect(potion).toBeVisible();
  const from = await potion.boundingBox();
  const to = await slot.boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 20 });
  await page.mouse.up();
  await expect(slot).toContainText('Minor Health Potion');
  await expect(page.locator('.potion-picker')).toHaveCount(0);
  await slot.click();
  await expect(page.locator('.potion-picker').getByRole('button', { name: /Minor Health Potion/ }))
    .toContainText('1 in backpack');
});

test('extra slots are locked without premium and usable with premium', async ({ page }) => {
  await page.goto(base);
  await expect(page.locator('.potion-use')).toHaveCount(8);
  await expect(page.locator('.potion-locked')).toHaveCount(3);
  for (const slot of await page.locator('.potion-locked').all()) await expect(slot).toBeDisabled();
  await expect(page.locator('.potion-belt')).not.toContainText('Premium');
  await page.locator('.belt-slot--locked').first().hover();
  await expect(page.getByRole('tooltip')).toHaveText('Available only with a premium subscription');
  await page.locator('.belt-slot--locked').first().click();
  await expect(page.locator('.potion-picker')).toHaveCount(0);
  await page.goto(base + '&premium=1');
  await expect(page.locator('.potion-locked')).toHaveCount(0);
  await expect(page.locator('.potion-belt')).not.toContainText('Premium');
  const lastSlot = page.getByRole('button', { name: 'Configure potion slot 8', exact: true });
  await lastSlot.click();
  await page.locator('.potion-picker').getByRole('button', { name: /Minor Health Potion/ }).click();
  await expect(lastSlot).toContainText('Minor Health Potion');
  await page.screenshot({ path: '/tmp/potion-premium-slots.png' });
});
