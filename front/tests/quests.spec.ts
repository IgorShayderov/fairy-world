import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://localhost:9001' });

test('town offers can be declined or accepted, and the journal shows progress and completed quests', async ({ page }) => {
  const wolf = { id: 1, code: 'wolf_hunt', monsterType: 'Dire Wolf', target: 20, rewardGold: 200 };
  let accepted = false;
  let completed = false;
  let acceptRequests = 0;
  await page.addInitScript(() => localStorage.setItem('access_token', 'quest-ui-test'));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/users/me')) data = {
      id: 1, name: 'Quest tester', level: 1, gold: 0, gems: 0, experience: 0, freeAttributes: 0,
      mapPosition: { x: 1470, y: 1040 }, activeBuffs: [], inventory: [], equippedItems: [], attributes: [], properties: [],
    };
    if (path.endsWith('/quests/1/accept')) {
      accepted = true;
      acceptRequests++;
      data = {};
    }
    if (path.endsWith('/quests')) {
      const entry = { questId: 1, townId: 1, quest: wolf, progress: completed ? 20 : 0, acceptedAt: new Date().toISOString(), completedAt: completed ? new Date().toISOString() : null };
      data = { town: { id: 1, name: 'EVERCROSS' }, available: accepted ? [] : [wolf], active: accepted && !completed ? [entry] : [], completed: completed ? [entry] : [] };
    }
    await route.fulfill({ json: { data, meta: {} } });
  });
  await page.goto('/quests');
  await expect(page.getByRole('heading', { name: 'Quest journal' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quests' })).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  expect(acceptRequests).toBe(0);
  await expect(page.getByRole('button', { name: 'Accept quest' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show declined offers again' }).click();
  await page.getByRole('button', { name: 'Accept quest' }).click();
  await expect(page.getByRole('heading', { name: 'Current quests (1)' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Current quests (1)' })).toBeVisible();
  expect(acceptRequests).toBe(1);
  completed = true;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Finished quests (1)' })).toBeVisible();
  await expect(page.getByText('200 gold awarded', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept quest' })).toHaveCount(0);
});
