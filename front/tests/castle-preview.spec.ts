import { expect, test } from '@playwright/test';
const base = 'http://127.0.0.1:5196/test/castle-preview.html';
test.setTimeout(90_000);

for (const zoom of [0.7, 1, 1.5]) {
  test(`castle map icon stays proportionate to landmarks at zoom ${zoom}`, async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    await page.goto(base + `?map&zoom=${zoom}`);
    const marker = page.locator('.private-castle-marker');
    await expect(marker).toBeVisible();
    await expect(marker).not.toContainText('Level');
    await expect(marker.locator('small')).toHaveCount(0);
    const icon = await marker.locator('svg').boundingBox();
    expect(icon!.width).toBeCloseTo(76 * zoom, 0);
    expect(icon!.height).toBeCloseTo(80 * zoom, 0);
    expect(await marker.locator('span').evaluate((el) => getComputedStyle(el).fontSize)).toBe('13px');
    await page.screenshot({ path: `/tmp/castle-map-zoom-${zoom}.png` });
  });
}

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

for (const width of [1440, 390]) {
  test(`compact castle header, resource tooltips and arrow navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '?protected');
    const heading = page.locator('.castle-heading');
    await expect(heading).not.toContainText('Your private domain');
    await expect(heading).not.toContainText('Near AURELIA');
    await expect(page.getByRole('link', { name: 'World map' })).toHaveCount(0);
    await expect(heading.locator('.castle-protection')).toContainText('Protected');
    if (width > 1000) {
      const name = await heading.locator('h1').boundingBox();
      const protection = await heading.locator('.castle-protection').boundingBox();
      expect(Math.abs(name!.y + name!.height / 2 - protection!.y - protection!.height / 2)).toBeLessThan(2);
    }
    const resources = page.getByRole('region', { name: 'Castle resources' });
    await expect(resources).not.toContainText('/hour');
    await expect(resources).not.toContainText('Castle rating');
    expect((await resources.boundingBox())!.height).toBeLessThan(width > 1000 ? 70 : 100);
    const wood = resources.locator(':scope > div').first();
    await wood.hover();
    await expect(page.getByRole('tooltip').filter({ hasText: '+240/hour' })).toBeVisible();
    const stone = resources.locator(':scope > div').nth(1);
    await stone.focus();
    await expect(page.getByRole('tooltip').filter({ hasText: '+180/hour' })).toBeVisible();
    const sections = page.getByRole('navigation', { name: 'Castle sections' });
    await expect(sections.getByRole('button')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^(Estate|Army|Raids|Reports|Rankings)$/ })).toHaveCount(0);
    for (const label of ['Army', 'Raids', 'Reports', 'Rankings', 'Estate']) {
      await sections.getByRole('button', { name: 'Next castle section' }).click();
      await expect(sections.locator('.castle-section-label')).toHaveText(label);
    }
    await sections.getByRole('button', { name: 'Previous castle section' }).click();
    await expect(page.getByRole('heading', { name: 'Castle rankings' })).toBeVisible();
    await sections.getByRole('button', { name: 'Next castle section' }).click();
    await expect(page.locator('.estate-layout')).toBeVisible();
    await page.screenshot({ path: `/tmp/castle-compact-${width}.png` });
  });
}

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
  await page.getByRole('button', { name: 'Next castle section' }).click();
  await page.getByLabel('Units to train').first().fill('2');
  await page.getByRole('button', { name: 'Train Oathguard', exact: true }).click();
  await expect(page.getByText('Training 2 Oathguard', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous castle section' }).click();
  await page.getByRole('button', { name: 'Previous castle section' }).click();
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
test('expanded estate keeps all twelve buildings selectable with mouse and keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  const estate = page.locator('.castle-estate');
  await expect(estate).toHaveAttribute('viewBox', '0 0 1200 680');
  const plots = estate.getByRole('button');
  await expect(plots).toHaveCount(12);
  for (const name of [
    'Crownkeep',
    'Timberwright Lodge',
    'Moonstone Quarry',
    'Oathguard Barracks',
    'Starfire Forge',
    'Vaulted Storehouse',
    'Dawnsteel Gates', 'West Arrow Tower', 'East Arrow Tower', 'North Mage Tower', 'South Mage Tower', 'Starlight Gem Mine',
  ]) {
    await estate
      .getByRole('button', { name: new RegExp(`^${name},`) })
      .locator('.plot-ring')
      .click();
    await expect(page.locator('.building-detail').getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await estate.getByRole('button', { name: /^Crownkeep,/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.building-detail').getByRole('heading', { name: 'Crownkeep', exact: true })).toBeVisible();
});
test('instant construction is advertised and immediately refreshes the new level', async ({ page }) => {
  await page.goto(base + '?instant');
  const before = await page.locator('.estate-layout').boundingBox();
  await expect(page.getByText('Instant construction · development mode')).toBeVisible();
  await page.getByRole('button', { name: 'Upgrade building', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Construction completed.');
  await expect(page.getByText('Level 4 / 10', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upgrade building', exact: true })).toBeEnabled();
  await expect(page.locator('.castle-page [data-action-toast]')).toHaveCount(0);
  expect((await page.locator('.estate-layout').boundingBox())!.y).toBe(before!.y);
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.locator('[data-action-toast]')).toHaveCount(0);
});
test('failed construction uses an overlay without shifting the estate', async ({ page }) => {
  await page.goto(base + '?upgradeError');
  const before = await page.locator('.estate-layout').boundingBox();
  await page.getByRole('button', { name: 'Upgrade building', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Not enough wood or stone');
  await expect(page.locator('.castle-page [role="alert"]')).toHaveCount(0);
  expect((await page.locator('.estate-layout').boundingBox())!.y).toBe(before!.y);
});
for (const viewport of [
  { width: 1728, height: 1000 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
]) {
  test(`complete estate and building controls fit at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(base + '?protected');
    await expect(page.getByRole('heading', { name: 'Moonward Keep' })).toBeVisible();
    const bounds = await page.locator('.castle-estate').boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height);
    await expect(page.getByRole('button', { name: 'Upgrade building', exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.building-selector').getByRole('button').last()).toBeInViewport({ ratio: 1 });
    const dimensions = await page.locator('.castle-page').evaluate((el) => ({
      height: el.clientHeight,
      scroll: el.scrollHeight,
      width: el.clientWidth,
      scrollWidth: el.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.height + 1);
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
    await page.screenshot({ path: `/tmp/castle-fit-${viewport.width}.png` });
  });
}
test('mobile estate keeps controls and content inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Moonward Keep' })).toBeVisible();
  await page.screenshot({ path: '/tmp/castle-estate-mobile.png', fullPage: true });
  const width = await page
    .locator('.castle-page')
    .evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  await page.getByRole('button', { name: 'Next castle section' }).click();
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
  await page.getByRole('button', { name: 'Found castle · 10,000 gold' }).click();
  await expect(page.getByRole('heading', { name: 'Dawnwatch Keep' })).toBeVisible();
});
