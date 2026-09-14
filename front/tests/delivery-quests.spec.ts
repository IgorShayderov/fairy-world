import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://localhost:9001' });

test('delivery quest names its destination and completes from the journal', async ({ page }) => {
  let completed = false;
  let destination = false;
  const quest = { id: 80, code: 'delivery', monsterType: 'DELIVERY', target: 1, rewardGold: 50, rewardExperience: 100,
    destinationTownId: 2, destination: { shopId: 2, name: 'AURELIA', x: 940, y: 620 } };
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'delivery-test');
    localStorage.setItem('fw_settings', JSON.stringify({ chatPosition: 'closed' }));
  });
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/users/me')) data = { id: 1, name: 'Courier', level: 1, gold: completed ? 50 : 0, gems: 0,
      accomplishedQuests: completed ? 1 : 0, inventory: [], equippedItems: [], attributes: [], properties: [], activeBuffs: [] };
    if (path.endsWith('/quests/80/deliver')) { completed = true; data = { success: true }; }
    if (path.endsWith('/quests')) {
      const entry = { questId: 80, quest, progress: completed ? 1 : 0, completedAt: completed ? new Date().toISOString() : null };
      data = { town: { id: destination ? 2 : 1, name: destination ? 'AURELIA' : 'EVERCROSS' }, available: [], active: completed ? [] : [entry], completed: completed ? [entry] : [] };
    }
    await route.fulfill({ json: { data, meta: {} } });
  });
  await page.goto('/quests');
  await expect(page.getByRole('heading', { name: 'Message for AURELIA' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deliver message' })).toBeDisabled();
  destination = true;
  await page.reload();
  await page.getByRole('button', { name: 'Deliver message' }).click();
  await expect(page.getByRole('tab', { name: 'Finished quests (1)' })).toBeVisible();
  await expect(page.getByText('Quests completed: 1! Your rewards have been added.')).toBeVisible();
  expect(completed).toBe(true);
});
