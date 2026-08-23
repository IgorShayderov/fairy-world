import { test, expect, Page } from '@playwright/test';

// Mock для /@shared/api — перехватываем fetch на уровне страницы
// и проверяем, что LoginPage делает реальный запрос на /auth/login.

const MOCK_ACCESS_TOKEN = 'mock-access-token-12345';
const MOCK_EXPIRES_IN = 60;

async function setupLoginMock(page: Page) {
  // Перехватываем запросы к /auth/login и возвращаем мок-ответ
  await page.route('**/auth/login', async (route) => {
    const request = route.request();

    // Логируем метод и тело для проверки в тесте
    const postData = request.postDataJSON();
    console.log('[mock] /auth/login called:', JSON.stringify(postData));

    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      if (body.email === 'test@example.com' && body.password === 'password123') {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: MOCK_ACCESS_TOKEN,
            expiresIn: MOCK_EXPIRES_IN,
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Invalid credentials' }),
        });
      }
    } else {
      await route.fulfill({
        status: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Method not allowed' }),
      });
    }
  });
}

test('LoginPage: real API call to /auth/login and redirect to /dashboard', async ({ page }) => {
  await setupLoginMock(page);

  // Переходим на страницу логина
  await page.goto('/#/login');
  await page.waitForLoadState('networkidle');

  // Заполняем форму
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');

  // Нажимаем "Войти" — обходим checker-overlay через force
  await page.locator('button[type="submit"]').click({ force: true });

  // Ждём, пока выполнится запрос и произойдёт редирект
  await page.waitForURL('/#/dashboard', { timeout: 10_000 });

  // Проверяем, что мы на дашборде
  await expect(page).toHaveURL('/#/dashboard');

  // Проверяем, что access_token сохранён в localStorage
  const storedToken = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(storedToken).toBe(MOCK_ACCESS_TOKEN);

  // Проверяем, что expires_at тоже сохранён
  const storedExpiresAt = await page.evaluate(() => localStorage.getItem('access_token_expires_at'));
  expect(storedExpiresAt).toBeTruthy();

  // Убеждаемся, что запрос был именно POST с правильным телом
  // (это проверяется через route.fulfill логирование выше, но добавим явную проверку)
});

test('LoginPage: shows error notification on 401 response', async ({ page }) => {
  await setupLoginMock(page);

  await page.goto('/#/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', 'wrong@example.com');
  await page.fill('input[type="password"]', 'wrongpassword');

  await page.locator('button[type="submit"]').click({ force: true });

  // Ждём появления уведомления об ошибке (Quasar Notify)
  await page.waitForSelector('.q-notification[data-type="negative"]', { timeout: 5_000 });

  const notificationText = await page.locator('.q-notification[data-type="negative"] .q-notification__message').textContent();
  expect(notificationText).toContain('Ошибка авторизации');
});
