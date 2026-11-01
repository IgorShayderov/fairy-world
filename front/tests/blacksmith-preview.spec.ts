import { expect, test } from '@playwright/test';

test('blacksmith clearly confirms destruction and refreshes gold and eligible items', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('http://127.0.0.1:5193/test/dungeon-preview.html?blacksmith=1');
  await expect(page.getByText('1000 gold + 10 gems per removal · You have 2500 gold and 25 gems')).toBeVisible();
  await expect(page.getByText('+12 damage')).toBeVisible();
  await page.getByRole('button', { name: 'Remove bonus · 1000 gold + 10 gems', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('This cannot be undone');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Iron Crossbow', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove bonus · 1000 gold + 10 gems', exact: true }).click();
  await page.screenshot({ path: '/tmp/blacksmith-confirm.png' });
  await page.getByRole('button', { name: 'Pay 1000 gold + 10 gems' }).click();
  await expect(page.getByRole('status')).toContainText('Your item has been kept');
  await expect(page.getByText('1000 gold + 10 gems per removal · You have 1500 gold and 15 gems')).toBeVisible();
  await expect(page.getByText('No equipment with an applied crafting bonus.')).toBeVisible();
});

test('blacksmith disables removal when gems are insufficient even with enough gold', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('http://127.0.0.1:5193/test/dungeon-preview.html?blacksmith=1&poorForge=1');
  const button = page.getByRole('button', { name: 'Remove bonus · 1000 gold + 10 gems', exact: true });
  await expect(button).toBeDisabled();
  await expect(button).toBeInViewport();
  await expect(page.getByText(/You have 2500 gold and 9 gems/)).toBeVisible();
});
