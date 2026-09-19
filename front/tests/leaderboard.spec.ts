import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://localhost:9001' });

test('shows the ranked player table from the menu', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'leaderboard-test');
    localStorage.setItem('fw_settings', JSON.stringify({ chatPosition: 'closed', sidebarExpanded: true }));
  });
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const leaderboard = [
      ...Array.from({ length: 10 }, (_, index) => ({
        rank: index + 1,
        userId: index + 1,
        name: index === 0 ? 'DragonSlayer' : `Player ${index + 1}`,
        level: 25 - index,
        killedMonsters: 100 - index,
        questsCompleted: 12 - index,
      })),
      ...[12, 13, 14].map((rank) => ({
        rank,
        userId: rank,
        name: `Player ${rank}`,
        level: 25 - rank,
        killedMonsters: 100 - rank,
        questsCompleted: 2,
      })),
    ];
    const data = path.endsWith('/users/leaderboard')
      ? leaderboard
      : path.endsWith('/users/me')
        ? { id: 13, name: 'Player 13', level: 12, mapPosition: { x: 1470, y: 1040 }, inventory: [], equippedItems: [], activeBuffs: [], attributes: [], properties: [] }
        : [];
    await route.fulfill({ json: { data, meta: {} } });
  });
  await page.goto('/profile');
  await page.getByText('Top players', { exact: true }).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByRole('heading', { name: 'Top players' })).toBeVisible();
  const row = page.getByRole('row', { name: /DragonSlayer/ });
  await expect(row).toContainText('1');
  await expect(row).toContainText('25');
  await expect(row).toContainText('100');
  await expect(row).toContainText('12');
  await expect(page.getByRole('row')).toHaveCount(14);
  const currentPlayerRow = page.getByRole('row', { name: /Player 13/ });
  await expect(currentPlayerRow).toHaveAttribute('data-current-player', 'true');
  await expect(currentPlayerRow).toHaveClass(/bg-amber-100/);
});
