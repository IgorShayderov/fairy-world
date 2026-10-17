import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

for (const size of [
  { width: 1440, height: 1000 },
  { width: 900, height: 640 },
]) {
  test(`encounter vitals, learned actions and full-width loot at ${size.width}x${size.height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(size);
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-battle-layout');
      localStorage.setItem('access_token_expires_at', new Date(Date.now() + 3600000).toISOString());
      localStorage.setItem('fw_settings', JSON.stringify({ sidebarExpanded: false, chatPosition: 'closed' }));
    });
    const user = {
      id: 1,
      name: 'Preview Hero',
      level: 20,
      gold: 100,
      gems: 0,
      quickBattleAvailable: true,
      mapPosition: { x: 1470, y: 960 },
      inventory: [],
      equippedItems: [],
      activeBuffs: [],
      attributes: [],
      properties: [],
      craftInventory: [],
      accomplishedQuests: 0,
    };
    const fighter = { health: 100, maxHealth: 100, damage: 25, defense: 0, movement: 3 };
    const battle = {
      id: 'layout-preview',
      status: 'ACTIVE',
      turn: 1,
      monsterType: 'Bone Knight',
      player: { ...fighter, name: user.name },
      monster: { ...fighter, id: 1, name: 'Bone Knight', level: 20 },
      canRetreat: false,
      powerAttackCooldown: 0,
      events: [],
      arena: {
        columns: 9,
        rows: 5,
        playerPosition: 20,
        monsterPosition: 21,
        blockedCells: [],
        reachableCells: [],
        canAttack: true,
        playerAttackRange: 1,
        playerMovement: 3,
        monsterMovement: 3,
        playerHasMoved: false,
      },
      skills: {
        mana: 100,
        maxMana: 150,
        abilities: [
          {
            id: 'mage-fireball',
            name: 'Fireball',
            class: 'MAGE',
            effect: 'fire',
            description: 'A learned spell',
            icon: 'local_fire_department',
            manaCost: 10,
            rank: 1,
            remainingCooldown: 0,
            unavailable: null,
          },
        ],
      },
    };
    const victory = {
      ...battle,
      status: 'VICTORY',
      turn: 2,
      monster: { ...battle.monster, health: 0 },
      skills: { ...battle.skills, mana: 90 },
      events: [
        {
          actor: 'PLAYER',
          action: 'SKILL',
          skillId: 'mage-fireball',
          skillName: 'Fireball',
          effect: 'fire',
          damage: 100,
          critical: false,
          dodged: false,
        },
      ],
      rewards: {
        gold: 133,
        experience: 241,
        craftItems: [],
        items: [
          {
            id: 1,
            name: 'Boots',
            icon: 'icon_boots.png',
            description: 'Leather boots',
            price: 20,
            rarity: 'COMMON',
            equipmentType: ['BOOTS'],
            attributes: [],
            properties: [],
            level: 20,
            quantity: 1,
            addedToInventory: true,
            inventoryItemId: 1,
          },
        ],
      },
    };
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith('/users/me')
        ? user
        : path.endsWith('/battle/active')
          ? battle
          : path.endsWith('/turn')
            ? victory
            : [];
      if (path.endsWith('/turn'))
        expect(route.request().postDataJSON()).toMatchObject({ action: 'SKILL', skillId: 'mage-fireball' });
      await route.fulfill({ json: { data, meta: {} } });
    });
    await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? '/');
    const panel = page.locator('.encounter-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByLabel('Combat skills')).toHaveCount(0);
    await expect(panel.getByLabel('Player vitals').getByRole('progressbar', { name: 'Mana' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    await expect(panel.getByRole('button', { name: /Power Strike/i })).toHaveCount(0);
    await panel.getByRole('button', { name: 'Tactical battle', exact: true }).click();
    const skill = panel.getByRole('button', { name: /Fireball/ });
    await expect(skill).toBeEnabled({ timeout: 60_000 });
    await expect(panel.getByLabel('Player vitals').getByRole('progressbar', { name: 'Mana' })).toHaveAttribute(
      'aria-valuemax',
      '150'
    );
    await expect(panel.getByRole('button', { name: /Power Strike/i })).toHaveCount(0);
    await skill.click();
    const drop = panel.getByRole('button', { name: 'Drop item', exact: true });
    await expect(drop).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByLabel('Combat skills')).toHaveCount(0);
    const assertStacked = async () => {
      const layout = await panel.evaluate((element) => {
        const field = element.querySelector('.tactical-battlefield')!.getBoundingClientRect();
        const log = element.querySelector('.encounter-log')!.getBoundingClientRect();
        return {
          fieldWidth: field.width,
          panelWidth: element.clientWidth,
          logTop: log.top,
          fieldBottom: field.bottom,
          overflow: element.scrollWidth > element.clientWidth,
        };
      });
      expect(Math.abs(layout.fieldWidth - layout.panelWidth)).toBeLessThan(3);
      expect(layout.logTop).toBeGreaterThanOrEqual(layout.fieldBottom - 1);
      expect(layout.overflow).toBe(false);
    };
    await assertStacked();
    await drop.click();
    await expect(panel.getByText('Item dropped', { exact: false })).toBeVisible();
    await assertStacked();
    const close = panel.getByRole('button', { name: 'Return to map', exact: true });
    await close.scrollIntoViewIfNeeded();
    await expect(close).toBeInViewport();
    await page.screenshot({ path: `/tmp/battle-loot-${size.width}.png` });
    await close.click();
    await expect(panel).toHaveCount(0);
  });
}
