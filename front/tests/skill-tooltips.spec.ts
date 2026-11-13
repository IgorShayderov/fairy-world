import { expect, test } from '@playwright/test';
import { SKILLS, skillBaseManaCost } from '../../back/src/skills/skills.catalog';
import { skillPresentation } from '../../back/src/skills/skill-presentation';

for (const width of [1440, 390]) {
  test(`skill upgrade previews include exact changes and work when locked at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 900 });
    let rank = 1;
    await page.route('**/preview-skills', async (route) => {
      if (route.request().method() === 'POST') rank++;
      const ranks: Record<string, number> = { 'scout-volley': rank, 'scout-pierce': 5, 'scout-precision': 20 };
      await route.fulfill({
        json: {
          class: 'SCOUT',
          ranks,
          level: 50,
          gems: 1000,
          points: { total: 50, spent: 26, available: 24 },
          resetCost: 500,
          classes: ['WARRIOR', 'SCOUT', 'MAGE'],
          locked: false,
          catalog: SKILLS.map((skill) => ({
            ...skill,
            ...skillPresentation(skill, ranks[skill.id] ?? 0),
            ...(skill.effect ? { manaCost: skillBaseManaCost(skill, ranks[skill.id] ?? 1) } : {}),
          })),
        },
      });
    });
    await page.goto('http://127.0.0.1:5196/test/skills-preview.html');
    const poison = page.locator('.skill-node').filter({ has: page.getByRole('heading', { name: 'Poisoned Arrow' }) });
    await expect(poison.locator('.skill-description')).toContainText('80% weapon damage');
    await expect(page.locator('.skill-description').filter({ hasText: /per rank|additional rank/ })).toHaveCount(0);
    await poison.getByRole('button', { name: 'Upgrade Poisoned Arrow' }).hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('80% → 84%');
    await expect(tooltip).toContainText('35% → 37%');
    await expect(tooltip).toContainText('78 → 80');
    await poison.getByRole('button', { name: 'Upgrade Poisoned Arrow' }).click();
    await expect(poison.locator('.skill-description')).toContainText('84% weapon damage');
    await expect(poison.locator('.skill-description')).toContainText('37% chance');
    const mastered = page.getByLabel('Precision upgrade preview', { exact: true });
    await mastered.focus();
    await expect(tooltip.filter({ hasText: 'Precision · Mastered' })).toContainText('Maximum rank reached');
    const unlearned = page.getByLabel('Survivalist upgrade preview', { exact: true });
    await unlearned.hover();
    const learning = tooltip.filter({ hasText: 'Survivalist' });
    await expect(learning).toContainText('Rank 0 → 1');
    await expect(learning).toContainText('+5%');
    await expect(learning).toContainText('+2');
    await expect(learning).toBeVisible();
    await expect(learning).toHaveCSS('opacity', '1');
    await expect(tooltip).toHaveCount(1);
    await expect(unlearned.getByRole('button')).toBeDisabled();
    await page.screenshot({ path: `/tmp/skill-tooltip-${width}.png` });
  });
}
