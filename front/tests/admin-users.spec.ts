import { expect, test } from '@playwright/test';
import type { AdminUserDetail, AdminProfileEdit, AdminUserCreate } from '../src/modules/Feedback/adminUsersTypes';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5192' });
for (const width of [1440, 390]) {
  test(`admin creates and manages a player at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => sessionStorage.setItem('fw_admin_token', 'adm_users-preview'));
    page.on('dialog', (dialog) => dialog.accept());
    let user: AdminUserDetail | undefined;
    let stale = false;
    let version = 0;
    const item = {
      id: 100,
      name: 'Silver Sword',
      level: 1,
      requiredPlayerLevel: 1,
      rarity: 'RARE',
      equipmentType: ['WEAPON'],
      attributes: [],
      properties: [{ name: 'DAMAGE', value: 12 }],
    };
    await page.route('**/api/v1/admin/**', async (route) => {
      const req = route.request();
      expect(req.headers().authorization).toBe('Bearer adm_users-preview');
      const path = new URL(req.url()).pathname;
      let data: unknown;
      if (path.endsWith('/auth/me')) data = { id: 1, name: 'Admin', email: 'admin@example.invalid' };
      else if (path.endsWith('/feedback')) data = { entries: [], total: 0, page: 1, pageSize: 20 };
      else if (path.endsWith('/users/items')) data = { entries: [item], total: 1, page: 1, pageSize: 20 };
      else if (path.endsWith('/users') && req.method() === 'POST') {
        const input = req.postDataJSON() as AdminUserCreate;
        expect(input.password).toBe('StrongPassword123!x');
        user = {
          id: 12,
          name: input.name,
          email: input.email,
          role: 'USER',
          stateToken: 'a'.repeat(64),
          locked: false,
          createdAt: new Date().toISOString(),
          experienceToNextLevel: 100,
          skillPoints: { total: 1, spent: 0, available: 1 },
          gameProfile: {
            id: 20,
            level: 1,
            experience: 0,
            gold: 0,
            gems: 0,
            coinsOfHonour: 0,
            freeAttributes: 0,
            inventory: [],
            profileAttributes: ['STRENGTH', 'AGILITY', 'ENDURANCE', 'WISDOM', 'CHARISMA'].map((name) => ({
              value: 5,
              attribute: { name },
            })) as NonNullable<AdminUserDetail['gameProfile']>['profileAttributes'],
            killedMonsters: 0,
            dungeonsCleared: 0,
            premiumAccount: null,
          },
          audits: [],
        };
        data = user;
      } else if (path.endsWith('/users'))
        data = { entries: user ? [user] : [], total: user ? 1 : 0, page: 1, pageSize: 20 };
      else if (user && path.includes('/users/12')) {
        if (req.method() === 'POST') {
          const body = req.postDataJSON() as AdminProfileEdit & { itemId?: number; quantity?: number; action?: string };
          expect(body.expectedState).toBe(user.stateToken);
          expect(body.reason).toBeTruthy();
          if (stale) {
            stale = false;
            await route.fulfill({
              status: 409,
              json: { message: 'Player data changed. Reload the user before saving.' },
            });
            return;
          }
          if (path.endsWith('/inventory/add')) {
            expect(body.itemId).toBe(100);
            user.gameProfile!.inventory.push({
              id: 77,
              itemId: 100,
              item,
              quantity: body.quantity!,
              isEquiped: false,
              slot: null,
              upgradeType: null,
              upgradeValue: null,
            });
          } else if (path.endsWith('/inventory/77')) {
            if (body.action === 'remove') user.gameProfile!.inventory = [];
            else user.gameProfile!.inventory[0]!.quantity = body.quantity!;
          } else {
            user.name = body.name;
            user.email = body.email;
            Object.assign(user.gameProfile!, {
              level: body.level,
              experience: body.experience,
              gold: body.gold,
              gems: body.gems,
              coinsOfHonour: body.coinsOfHonour,
              freeAttributes: body.freeAttributes,
            });
          }
          user.stateToken = (++version).toString(16).padStart(64, '0');
          user.audits.unshift({
            id: String(version),
            action: 'ADMIN_EDIT',
            reason: body.reason,
            createdAt: new Date().toISOString(),
            admin: { id: 1, name: 'Admin' },
          });
        }
        data = user;
      } else throw new Error(`Unexpected request ${path}`);
      await route.fulfill({ json: { data, meta: {} } });
    });
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Users', exact: true }).click();
    await page.getByRole('button', { name: 'Create user', exact: true }).click();
    const create = page.getByRole('form', { name: 'Create user', exact: true });
    await create.getByLabel('Name', { exact: true }).fill('Test Hero');
    await create.getByLabel('Email', { exact: true }).fill('hero@example.invalid');
    await create.getByLabel('Initial password').fill('StrongPassword123!x');
    await create.getByLabel('Creation reason').fill('Create support test account');
    await create.getByRole('button', { name: 'Create player', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Test Hero · #12' })).toBeVisible();
    await expect(create).toHaveCount(0);
    const reason = page.getByLabel('Reason for next change');
    const profile = page.getByRole('form', { name: 'Edit player profile' });
    await reason.fill('Correct test balance');
    await profile.getByLabel('Gold', { exact: true }).fill('1200');
    await profile.getByLabel('Level', { exact: true }).fill('10');
    await profile.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByRole('status')).toHaveText('Profile saved.');
    expect(user?.gameProfile?.gold).toBe(1200);
    await reason.fill('Check stale edit');
    await profile.getByLabel('Gold', { exact: true }).fill('1500');
    stale = true;
    await profile.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByRole('alert')).toContainText('Player data changed');
    await expect(profile.getByLabel('Gold', { exact: true })).toHaveValue('1500');
    await page.getByRole('button', { name: 'Reload player' }).click();
    await expect(profile.getByLabel('Gold', { exact: true })).toHaveValue('1200');
    await page.getByLabel('Search item catalog').fill('Sword');
    await page.getByRole('button', { name: 'Find items' }).click();
    await page.getByLabel('Item to grant').selectOption('100');
    await reason.fill('Grant quest reward');
    await page.getByLabel('Grant quantity').fill('2');
    await page.getByRole('button', { name: 'Add to backpack' }).click();
    await expect(page.getByRole('status')).toHaveText('Item added to the backpack.');
    const quantity = page.getByLabel('Quantity for Silver Sword entry 77');
    await expect(quantity).toHaveValue('2');
    await reason.fill('Adjust reward quantity');
    await quantity.fill('3');
    await page.getByRole('button', { name: 'Set quantity' }).click();
    await expect(quantity).toHaveValue('3');
    await page.screenshot({ path: `/tmp/admin-users-${width}.png`, fullPage: true });
    expect(await page.locator('.admin-page').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
    await reason.fill('Remove duplicate reward');
    await page.getByRole('button', { name: 'Remove stack' }).click();
    await expect(page.getByText('Inventory is empty.', { exact: true })).toBeVisible();
    user!.locked = true;
    await page.getByRole('button', { name: 'Reload player' }).click();
    await expect(page.getByRole('alert')).toContainText('Editing is locked');
    await expect(profile.getByRole('button', { name: 'Save profile' })).toBeDisabled();
  });
}
