import { test, expect } from '@playwright/test';

test('services tab is visible', async ({ page }) => {
  await page.goto('/');

  const eyebrow = page.locator('.eyebrow');
  await expect(eyebrow).toHaveText('Управление сервисом');

  const h1 = page.getByRole('heading', { name: 'Сервис 1' });
  await expect(h1).toBeVisible();
});

test('service status is shown', async ({ page }) => {
  await page.goto('/');
  
  await expect(page.locator('.status-card')).toHaveText(/Порт/);
});

test('can switch between services', async ({ page }) => {
  await page.goto('/');

  // Изначально активен Сервис 1
  const h1 = page.getByRole('heading', { name: 'Сервис 1' });
  await expect(h1).toBeVisible();
  await expect(page.locator('.nav-item')).toHaveCount(2);

  // Переключаемся на Сервис 2
  const navButton2 = page.locator('.nav-item').nth(1);
  await navButton2.click();
  
  // Ждём обновления (через интервал) и проверяем заголовок
  await page.waitForTimeout(3000);
  
  const h2 = page.getByRole('heading', { name: 'Сервис 2' });
  await expect(h2).toBeVisible();

  // Снова переключаемся на Сервис 1
  const navButton1 = page.locator('.nav-item').nth(0);
  await navButton1.click();
  
  await page.waitForTimeout(3000);
  
  const h1Again = page.getByRole('heading', { name: 'Сервис 1' });
  await expect(h1Again).toBeVisible();
});
