import { test, expect } from '@playwright/test';

const COLLEGE_ID = 'college-campizo-001';
const USER_ID = 'user-campizo-test-001';
const ADMIN_PIN = 'campizo-admin-2026';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([cid, uid]) => {
      localStorage.setItem('ch_college_id', cid);
      localStorage.setItem('ch_user_id', uid);
    },
    [COLLEGE_ID, USER_ID]
  );
});

test('homepage renders Campizo shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('Campizo');
  await expect(page).toHaveTitle(/Campizo/);
});

test('professors page loads real data from API', async ({ page }) => {
  await page.goto('/professors/dr-alan-turing');
  await expect(page).toHaveTitle(/Campizo/);
  await expect(page.getByText(/Alan Turing/i).first()).toBeVisible({ timeout: 15000 });
});

test('academic resources page renders', async ({ page }) => {
  await page.goto('/academic-resources');
  await expect(page).toHaveTitle(/Campizo/);
  await expect(page.locator('#main-content')).toBeVisible();
});

test('connect page renders', async ({ page }) => {
  await page.goto('/connect');
  await expect(page).toHaveTitle(/Campizo/);
  await expect(page.locator('#main-content')).toBeVisible();
});

test('admin area is protected and requires PIN login', async ({ page }) => {
  await page.goto('/admin/feature-flags');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText(/Admin Console/i)).toBeVisible();

  await page.fill('#admin-pin', ADMIN_PIN);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin\/feature-flags/);
  await expect(page.locator('#main-content')).toBeVisible();
});

test('admin login rejects wrong PIN', async ({ page }) => {
  await page.goto('/admin/feature-flags');
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.fill('#admin-pin', 'wrong-pin');
  await page.click('button[type="submit"]');

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});
