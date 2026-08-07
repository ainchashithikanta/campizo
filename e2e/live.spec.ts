import { test, expect } from '@playwright/test';

const COLLEGE_ID = 'college-stanford-001';
const USER_ID = 'user-stanford-test-001';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([cid, uid]) => {
      localStorage.setItem('ch_college_id', cid);
      localStorage.setItem('ch_user_id', uid);
    },
    [COLLEGE_ID, USER_ID]
  );
});

test('homepage renders College Hub shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('College Hub');
  await expect(page).toHaveTitle(/College Hub/);
});

test('professors page loads real data from API', async ({ page }) => {
  await page.goto('/professors/dr-alan-turing');
  await expect(page).toHaveTitle(/College Hub/);
  await expect(page.getByText(/Alan Turing/i).first()).toBeVisible({ timeout: 15000 });
});

test('academic resources page renders', async ({ page }) => {
  await page.goto('/academic-resources');
  await expect(page).toHaveTitle(/College Hub/);
  await expect(page.locator('#main-content')).toBeVisible();
});

test('connect page renders', async ({ page }) => {
  await page.goto('/connect');
  await expect(page).toHaveTitle(/College Hub/);
  await expect(page.locator('#main-content')).toBeVisible();
});

test('admin feature flags page renders', async ({ page }) => {
  await page.goto('/admin/feature-flags');
  await expect(page).toHaveTitle(/College Hub/);
  await expect(page.locator('#main-content')).toBeVisible();
});
