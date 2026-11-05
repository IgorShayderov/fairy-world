import { expect, test } from '@playwright/test';
const base = 'http://127.0.0.1:5196/test/castle-preview.html';
test.setTimeout(90_000);

test('skills menu pulses for available points and respects reduced motion', async ({ page }) => {
  await page.goto(base + '?empty&skillPoints');
  const skills = page.getByRole('link', { name: 'Skills', exact: true });
  await expect(skills).toHaveAttribute('data-attention', 'true');
  expect(await skills.evaluate((el) => getComputedStyle(el, '::after').animationName)).toMatch(/^skill-points-pulse/);
  await skills.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Unspent skill points available');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await skills.evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe('none');
  await page.evaluate(() => (window as unknown as { spendSkillPoint: () => void }).spendSkillPoint());
  await expect(skills).not.toHaveAttribute('data-attention', 'true');
});

test('castle menu is locked below level 25 with a tooltip and unlocks at level 25', async ({ page }) => {
  await page.goto(base + '?empty&map&locked');
  const castleLink = page.getByRole('link', { name: 'Castle', exact: true });
  await expect(castleLink).toHaveAttribute('aria-disabled', 'true');
  await castleLink.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Castles unlock at level 25');
  const bounds = await castleLink.boundingBox();
  await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await expect(page.locator('.castle-page')).toHaveCount(0);
  await castleLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.castle-page')).toHaveCount(0);
  await page.goto(base + '?empty&map');
  await expect(castleLink).not.toHaveAttribute('aria-disabled', 'true');
  await castleLink.click();
  await expect(page.locator('.founding-panel')).toBeVisible();
});

for (const viewport of [
  { width: 1728, height: 1000 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`founding page stacks sections with production styles at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(base + '?empty&locked&noRankings');
    await expect(page.locator('.founding-panel')).toBeVisible();
    const header = await page.locator('.castle-heading').boundingBox();
    const founding = await page.locator('.founding-panel').boundingBox();
    const ranking = await page.locator('.ranking-section').boundingBox();
    expect(header!.y + header!.height).toBeLessThanOrEqual(founding!.y);
    expect(founding!.y + founding!.height).toBeLessThanOrEqual(ranking!.y);
    expect(Math.abs(header!.x - founding!.x)).toBeLessThan(2);
    expect(Math.abs(ranking!.width - founding!.width)).toBeLessThan(2);
    const pageWidth = await page
      .locator('.castle-page')
      .evaluate((el) => ({ scroll: el.scrollWidth, width: el.clientWidth }));
    expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.width + 1);
    await expect(page.locator('.ranking-section table')).toHaveCount(0);
    await page.screenshot({ path: `/tmp/castle-founding-${viewport.width}.png` });
  });
}
test('estate, construction, training, PvP scouting and confirmed departure', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Moonward Keep' })).toBeVisible();
  await page.screenshot({ path: '/tmp/castle-estate-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Timberwright Lodge, level 2. Select building' }).click();
  await page.getByRole('button', { name: 'Upgrade building', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Construction started');
  await expect(page.getByRole('button', { name: 'Upgrade building', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Army', exact: true }).click();
  await page.getByLabel('Units to train').first().fill('2');
  await page.getByRole('button', { name: 'Train Oathguard', exact: true }).click();
  await expect(page.getByText('Training 2 Oathguard', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rankings', exact: true }).click();
  await page.getByRole('button', { name: 'Scout castle' }).click();
  await expect(page.getByRole('heading', { name: 'Silverthorn Citadel' })).toBeVisible();
  await page.getByLabel('Oathguard (20 ready)').fill('20');
  await page.getByLabel('Thorn Rangers (10 ready)').fill('10');
  await page.getByRole('button', { name: 'Review raid' }).click();
  await expect(page.getByRole('dialog')).toContainText('Launching ends your castle');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Your army is on a castle raid')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review raid' }).click();
  await page.getByRole('button', { name: 'Send army', exact: true }).click();
  await expect(page.getByText('Your army is on a castle raid')).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile estate keeps controls and content inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Moonward Keep' })).toBeVisible();
  await page.screenshot({ path: '/tmp/castle-estate-mobile.png', fullPage: true });
  const width = await page
    .locator('.castle-page')
    .evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  await page.getByRole('button', { name: 'Army', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Train Oathguard', exact: true })).toBeVisible();
});
test('level gate and private map placement reject forest before founding', async ({ page }) => {
  await page.goto(base + '?empty&locked');
  await expect(page.getByText('Reach level 25 to found your castle.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Choose a plot on the map' })).toHaveCount(0);
  await page.goto(base + '?empty&map');
  await page.getByRole('button', { name: 'Select forest', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('outside forests');
  await expect(page.getByRole('button', { name: /Found castle ·/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Select open ground', exact: true }).click();
  await page.getByLabel('Castle name').fill('Dawnwatch Keep');
  await page.getByRole('button', { name: 'Found castle · 2,500 gold' }).click();
  await expect(page.getByRole('heading', { name: 'Dawnwatch Keep' })).toBeVisible();
});
