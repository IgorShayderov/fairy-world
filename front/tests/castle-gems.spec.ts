import { expect, test } from '@playwright/test';
const base = 'http://127.0.0.1:5196/test/castle-preview.html';
test.setTimeout(90_000);

test('castle mine unlock, tower unlock and timed gem collection are visible', async ({ page }) => {
  await page.goto(base);
  await page.locator('.building-selector').getByRole('button', { name: /North Mage Tower/ }).click();
  await expect(page.getByText('Requires Crownkeep level 9.', { exact: true })).toBeVisible();
  await page.locator('.building-selector').getByRole('button', { name: /Starlight Gem Mine/ }).click();
  await expect(page.getByText('Requires Crownkeep level 5.', { exact: true })).toBeVisible();
  await page.goto(base + '?mining');
  await page.locator('.building-selector').getByRole('button', { name: /Starlight Gem Mine/ }).click();
  await page.getByRole('button', { name: 'Start mining expedition' }).click();
  await expect(page.getByText('Your gem is ready.')).toBeVisible();
  await page.getByRole('button', { name: 'Collect gem', exact: true }).click();
  await expect(page.getByText('◆ +5 damage · mine level 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start mining expedition' })).toBeVisible();
});

test('blacksmith shows level-based socket prices, inserts gems, and confirms destructive removal', async ({ page }) => {
  const entry = { id: 42, isEquiped: false, hasSocket: false, socketGemType: null as string | null, socketGemValue: null as number | null, item: { name: 'Iron Helm', level: 10 } };
  const offer = { prices: { goldPerLevel: 500, gems: 10, removalGoldPerLevel: 100 }, gold: 20000, gems: 50, items: [entry], equipmentGems: [{ id: 'gem1', type: 'DAMAGE', value: 8, mineLevel: 2 }] };
  const actions: string[] = [];
  await page.route('**/locations/blacksmith/sockets**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      actions.push(body.action);
      if (body.action === 'add') { expect(body).toMatchObject({ expectedCost: 5000, expectedGemCost: 10 }); entry.hasSocket = true; offer.gold -= 5000; offer.gems -= 10; }
      if (body.action === 'insert') { expect(body.gemId).toBe('gem1'); entry.socketGemType = 'DAMAGE'; entry.socketGemValue = 8; offer.equipmentGems = []; }
      if (body.action === 'remove') { expect(body).toMatchObject({ expectedCost: 1000, expectedGemCost: 0 }); entry.hasSocket = false; entry.socketGemType = null; entry.socketGemValue = null; offer.gold -= 1000; }
      await route.fulfill({ json: { success: true } });
    } else await route.fulfill({ json: offer });
  });
  await page.goto(base + '?sockets');
  await page.getByRole('button', { name: 'Add socket · 5000 gold + 10 gems' }).click();
  expect(actions).toEqual([]);
  await page.getByRole('button', { name: 'Confirm add' }).click();
  await expect(page.getByText('◆ Empty socket')).toBeVisible();
  await page.getByLabel('Gem for Iron Helm').selectOption('gem1');
  await page.getByRole('button', { name: 'Insert gem · free' }).click();
  await expect(page.getByText('This gem will be bound to the item.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm insert' }).click();
  await expect(page.getByText('◆ +8 damage')).toBeVisible();
  await page.getByRole('button', { name: 'Remove socket · 1000 gold' }).click();
  await expect(page.getByText('The socket and any inserted gem will be permanently destroyed.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(actions).toEqual(['add', 'insert']);
  await page.getByRole('button', { name: 'Remove socket · 1000 gold' }).click();
  await page.getByRole('button', { name: 'Confirm remove' }).click();
  await expect(page.getByRole('button', { name: 'Add socket · 5000 gold + 10 gems' })).toBeVisible();
  expect(actions).toEqual(['add', 'insert', 'remove']);
});
