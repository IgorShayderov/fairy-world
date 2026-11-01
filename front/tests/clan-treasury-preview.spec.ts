import { expect, test } from '@playwright/test';
const url = 'http://127.0.0.1:5193/test/clan-preview.html';
test.setTimeout(90_000);

test('leader deposits both currencies and upgrades from the treasury, not the wallet', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Clan upgrades', exact: true }).click();
  const treasury = page.getByRole('region', { name: 'Clan treasury', exact: true });
  const upgrade = page.getByRole('button', { name: 'Upgrade · 2,500 treasury gold' }).first();
  await expect(upgrade).toBeDisabled();
  await treasury.getByLabel('Gold to deposit').fill('3000');
  await treasury.getByLabel('Gems to deposit').fill('10');
  await treasury.getByRole('button', { name: 'Deposit', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Nobody, including the clan head');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(treasury).toContainText('Your wallet: 5000 gold · 50 gems');
  await treasury.getByRole('button', { name: 'Deposit', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm permanent deposit', exact: true }).click();
  await expect(treasury).toContainText('3000 gold · 10 gems');
  await expect(treasury).toContainText('Your wallet: 2000 gold · 40 gems');
  await expect(upgrade).toBeEnabled();
  await upgrade.click();
  await expect(treasury).toContainText('500 gold · 10 gems');
  await expect(treasury).toContainText('Your wallet: 2000 gold · 40 gems');
  await page.screenshot({ path: '/tmp/clan-treasury.png', fullPage: true });
});

for (const role of ['MEMBER', 'OFFICER']) test(`${role} can donate but cannot upgrade or withdraw`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + '?role=' + role);
  await page.getByRole('button', { name: 'Clan upgrades', exact: true }).click();
  const treasury = page.getByRole('region', { name: 'Clan treasury', exact: true });
  await expect(page.getByRole('button', { name: /^Upgrade ·/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /withdraw/i })).toHaveCount(0);
  await expect(treasury.getByRole('button', { name: 'Deposit', exact: true })).toBeDisabled();
  await treasury.getByLabel('Gems to deposit').fill('51');
  await expect(treasury.getByRole('button', { name: 'Deposit', exact: true })).toBeDisabled();
  await treasury.getByLabel('Gems to deposit').fill('5');
  await treasury.getByRole('button', { name: 'Deposit', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm permanent deposit', exact: true }).click();
  await expect(treasury).toContainText('0 gold · 5 gems');
  await expect(treasury).toContainText('Your wallet: 5000 gold · 45 gems');
});
