import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const base = 'http://127.0.0.1:5193/test/dungeon-preview.html';

test('mage minion buff animates on the caster and displays its remaining charges', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '?enemySpell=1&enemyBuff=1&edgeStart=1');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  await page.evaluate(() => {
    const layer = document.querySelector('.combat-floating-layer');
    if (!layer) throw new Error('Missing battle effect layer');
    new MutationObserver(() => {
      if (layer.textContent?.includes('ARCANE FOCUS')) document.body.dataset.enemyBuffSeen = 'yes';
    }).observe(layer, { childList: true, subtree: true, characterData: true });
  });
  await page.screenshot({ path: '/tmp/closer-battle-camera.png' });
  await page.getByRole('button', { name: 'Defend / End turn' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-enemy-buff-seen', 'yes', { timeout: 30_000 });
  await expect(page.locator('.status-badges')).toContainText('Spell damage +35% · 2 attacks');
  await expect(page.locator('.combat-hud-log')).toContainText('Arcane Focus');
  await expect(page.getByRole('button', { name: 'Defend / End turn' })).toBeEnabled({ timeout: 30_000 });
});

test('encounter overview fills the panel and keeps battle choices at the bottom', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1100, height: 800 },
    { width: 650, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(base + '?standard=1&premium=1');
    const panel = page.locator('.encounter-panel');
    const footer = panel.locator(':scope > footer');
    const overview = panel.locator('.battlefield-grid');
    await expect(page.getByRole('button', { name: 'Tactical battle', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Quick battle', exact: true })).toBeInViewport();
    const bounds = await panel.boundingBox();
    const buttons = await footer.boundingBox();
    const content = await overview.boundingBox();
    expect(bounds).not.toBeNull();
    expect(buttons).not.toBeNull();
    expect(content).not.toBeNull();
    expect(Math.abs(bounds!.y + bounds!.height - buttons!.y - buttons!.height)).toBeLessThanOrEqual(2);
    expect(content!.height).toBeGreaterThan(bounds!.height * 0.5);
    expect(await panel.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
    await expect(page.getByLabel('Player vitals')).toBeInViewport();
    await expect(page.getByLabel('Monster vitals')).toBeInViewport();
    if (viewport.width === 1440) await page.screenshot({ path: '/tmp/encounter-overview-layout.png' });
  }
});

test('ranged monster casts across the arena with a visible impact and named combat log', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '?enemySpell=1');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  await expect(page.getByText('Ranged attacks', { exact: true })).toBeVisible();
  await page.locator('.combat-floating-layer').evaluate((layer) => {
    new MutationObserver(() => {
      if (layer.textContent?.includes('-10')) document.body.dataset.enemySpellImpact = 'yes';
    }).observe(layer, { childList: true, subtree: true, characterData: true });
  });
  await page.getByRole('button', { name: 'Defend / End turn' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-enemy-spell-impact', 'yes', { timeout: 30_000 });
  await page.screenshot({ path: '/tmp/enemy-spell-preview.png' });
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('.combat-hud-log')).toContainText('Frost Revenant — Frost Bolt');
  expect(errors).toEqual([]);
});

test('reforged ranger abilities show their control effects inside the battlefield', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '?scout=1');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Poisoned Arrow', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Frost Arrow', exact: true }).click();
  await expect(page.getByLabel('Enemy status effects')).toContainText('Slowed');
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Piercing Shot', exact: true }).click();
  await expect(page.getByLabel('Enemy status effects')).toContainText('Armor −30%');
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeEnabled({ timeout: 30_000 });
  await page.screenshot({ path: '/tmp/ranger-status-preview.png' });
});

test('restored legacy dungeon enables Attack and plays the skill cast instead of silently updating HP', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '?legacy=1');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  const attack = page.getByRole('button', { name: 'Attack', exact: true });
  await expect(attack).toBeEnabled();
  await page.locator('.combat-floating-layer').evaluate((layer) => {
    new MutationObserver(() => {
      const impact = layer.querySelector('.floating-combat-text');
      if (impact?.textContent) document.body.dataset.lastSkillImpact = impact.textContent;
    }).observe(layer, { childList: true, subtree: true, characterData: true });
  });
  await page.getByRole('button', { name: 'Fireball', exact: true }).click();
  await expect(attack).toBeDisabled();
  await expect(page.locator('body')).toHaveAttribute('data-last-skill-impact', '-20', { timeout: 30_000 });
  await page.screenshot({ path: '/tmp/dungeon-skill-impact.png' });
  await expect(attack).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('.combat-hud-log')).toContainText('Fireball');
  await attack.click();
  await expect(page.getByText('Wave 3 / 4')).toBeVisible();
});

test('guardians lead directly into the boss on one canvas, with damage totals and five HP slots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const models: string[] = [];
  page.on('response', (response) => {
    if (response.ok() && response.url().endsWith('.glb')) models.push(response.url());
  });
  await page.goto(base + '?boss=Icebound%20Sovereign');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  await page.locator('canvas').evaluate((canvas) => canvas.setAttribute('data-original', 'yes'));
  await expect(page.getByRole('button', { name: /Assign potion slot/ })).toHaveCount(5);
  await expect(page.getByRole('button', { name: /Drink .* from slot/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Assign potion slot 1', exact: true }).click();
  await page.getByRole('button', { name: 'Minor Health Potion · +50 HP', exact: true }).click();
  await expect(page.locator('.potion-belt')).not.toContainText('Attack Potion');
  await page.getByRole('button', { name: 'Drink Minor Health Potion from slot 1' }).click();
  await expect(page.getByRole('button', { name: 'Assign potion slot 1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Drink .* from slot/ })).toHaveCount(0);
  await page.getByLabel('Dungeon damage contributions').locator('summary').click();
  for (let index = 0; index < 3; index++) {
    const attack = page.getByRole('button', { name: 'Attack', exact: true });
    await expect(attack).toBeEnabled({ timeout: 60_000 });
    await attack.click();
    await expect(attack).toBeDisabled();
    await expect(attack).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator('canvas[data-original="yes"]')).toHaveCount(1);
  }
  await expect(page.getByLabel('Dungeon damage contributions')).toContainText('240');
  expect(models.some((url) => url.endsWith('/golem-ice.glb'))).toBe(true);
  await page.locator('.battle-scene').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/dungeon-boss-preview.png' });
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await expect(page.getByLabel('Dungeon damage contributions')).toContainText('320');
  await expect(page.getByRole('button', { name: 'Return to map', exact: true })).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('ordinary battle fits without scrolling and has icon-only skills inside the scene', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}?standard=1`);
  await page.getByRole('button', { name: 'Tactical battle', exact: true }).click();
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  const bounds = await page.locator('.encounter-panel').boundingBox();
  expect(bounds?.x).toBe(8);
  expect(bounds?.y).toBe(56);
  expect(bounds?.width).toBe(1360);
  expect(bounds?.height).toBe(936);
  const panel = page.locator('.encounter-panel');
  expect(await panel.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  await expect(page.locator('.tactical-battlefield .skill-bar')).toBeVisible();
  await expect(page.locator('.skill-bar')).not.toContainText('Fireball');
  await page.getByRole('button', { name: 'Fireball', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toContainText('Launch a blazing sphere');
  await page.screenshot({ path: '/tmp/fullscreen-battle-preview.png' });
  await page.setViewportSize({ width: 650, height: 700 });
  await page.reload();
  await page.getByRole('button', { name: 'Tactical battle', exact: true }).click();
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  expect(await panel.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeInViewport();
  await expect(page.locator('.skill-bar')).toBeInViewport();
  await page.screenshot({ path: '/tmp/compact-battle-preview.png' });
});

test('melee attack becomes usable after defending while an enemy closes the distance', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '?melee=1');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  const attack = page.getByRole('button', { name: 'Attack', exact: true });
  await expect(attack).toBeDisabled();
  await page.getByRole('button', { name: 'Defend / End turn' }).click();
  await expect(attack).toBeEnabled({ timeout: 60_000 });
  expect(await page.locator('.dungeon-panel').evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  await attack.click();
  await expect(page.getByText('Wave 2 / 4')).toBeVisible();
});
