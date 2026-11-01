import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const base = 'http://127.0.0.1:5193/test/dungeon-preview.html';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createGain;
    const observed = new WeakSet<AudioContext>();
    AudioContext.prototype.createGain = function () {
      const gain = original.call(this);
      if (!observed.has(this)) {
        observed.add(this);
        const analyser = this.createAnalyser();
        gain.connect(analyser);
        const values = new Float32Array(analyser.fftSize);
        const measure = () => {
          analyser.getFloatTimeDomainData(values);
          if (values.some((value) => Math.abs(value) > 0.0001)) document.body.dataset.audioHeard = 'yes';
          requestAnimationFrame(measure);
        };
        requestAnimationFrame(measure);
      }
      return gain;
    };
  });
});

test('sound switch persists, supports the keyboard, and produces audible output on request', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(base + '?settings=1');
  const toggle = page.getByRole('switch', { name: 'Game sounds' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('button', { name: 'Test sound' })).toHaveCount(0);
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-audio-heard', 'yes');
  await page.screenshot({ path: '/tmp/game-sound-settings.png' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => localStorage.getItem('fairy-world:sound-enabled'))).toBe('false');
});

test('battle animation produces sound when enabled and stays silent after muting', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(base + '?enemySpell=1');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Defend / End turn' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-audio-heard', 'yes');
  await page.goto(base + '?settings=1');
  await page.getByRole('switch', { name: 'Game sounds' }).click();
  await page.goto(base + '?enemySpell=1');
  await expect(page.locator('.scene-message')).toHaveCount(0, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Defend / End turn' }).click();
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('.combat-hud-log')).toContainText('Frost Bolt');
  await expect(page.locator('body')).not.toHaveAttribute('data-audio-heard');
});
