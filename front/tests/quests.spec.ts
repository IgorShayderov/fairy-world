import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://localhost:9001' });

test('journal separates current and finished quests without a town board', async ({ page }) => {
  const wolf = { id: 1, code: 'wolf_hunt', monsterType: 'Dire Wolf', target: 20, rewardGold: 200 };
  let accepted = true;
  let completed = false;
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'quest-ui-test');
    localStorage.setItem('fw_settings', JSON.stringify({ chatPosition: 'closed', sidebarExpanded: true }));
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/users/me')) data = {
      id: 1, name: 'Quest tester', level: 1, gold: 0, gems: 0, experience: 0, freeAttributes: 0,
      mapPosition: { x: 1470, y: 1040 }, activeBuffs: [], inventory: [], equippedItems: [], attributes: [], properties: [],
    };
    if (path.endsWith('/quests')) {
      const entry = { questId: 1, townId: 1, quest: wolf, progress: completed ? 20 : 0, acceptedAt: new Date().toISOString(), completedAt: completed ? new Date().toISOString() : null };
      data = { town: { id: 1, name: 'EVERCROSS' }, available: accepted ? [] : [wolf], active: accepted && !completed ? [entry] : [], completed: completed ? [entry] : [] };
    }
    if (path.endsWith('/quests/1/accept')) accepted = true;
    await route.fulfill({ json: { data, meta: {} } });
  });
  await page.goto('/quests');
  await expect(page.getByRole('heading', { name: 'Quest journal' })).toBeVisible();
  await expect(page.getByText('Quests', { exact: true })).toBeVisible();
  await expect(page.getByText(/Town quest board/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Accept quest' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Current quests (1)' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
  await expect(page.getByRole('heading', { name: 'Wolves at the gates' })).toHaveCSS('font-size', '14px');
  await page.getByRole('tab', { name: 'Finished quests (0)' }).click();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText('Your completed quests will appear here.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Current quests (1)' })).toHaveAttribute('aria-selected', 'true');
  completed = true;
  await page.reload();
  await page.getByRole('tab', { name: 'Finished quests (1)' }).click();
  await expect(page.getByText('200 gold awarded', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept quest' })).toHaveCount(0);
  accepted = false;
  completed = false;
  await page.goto('/');
  await page.locator('canvas').click();
  await page.getByRole('button', { name: 'Quests', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  expect(accepted).toBe(false);
  await page.getByRole('button', { name: 'Show declined offers again' }).click();
  await page.getByRole('button', { name: 'Accept quest' }).click();
  await expect(page.getByRole('button', { name: 'Accept quest' })).toHaveCount(0);
  expect(accepted).toBe(true);
});
