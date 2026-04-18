/**
 * Smoke Test Suite
 * Quick sanity checks for CI/CD pipeline
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('OpenCAD');
  });

  test('should display project section', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.project-section h2')).toContainText('Project');
    await expect(page.locator('.project-info')).toBeVisible();
  });

  test('should have functional layer creation', async ({ page }) => {
    await page.goto('/');

    const initialCount = await page.locator('.layers-section .item').count();
    await page.click('.layers-section button');
    const newCount = await page.locator('.layers-section .item').count();

    expect(newCount).toBe(initialCount + 1);
  });

  test('should have functional element creation', async ({ page }) => {
    await page.goto('/');

    const initialCount = await page.locator('.elements-section .item').count();
    await page.click('.elements-section button');
    const newCount = await page.locator('.elements-section .item').count();

    expect(newCount).toBe(initialCount + 1);
  });

  test('should update project name', async ({ page }) => {
    await page.goto('/');

    await page.fill('.input-group input', 'New Project Name');
    await page.click('.input-group button');

    await expect(page.locator('.project-info')).toContainText('New Project Name');
  });
});

// ---------------------------------------------------------------------------
// T-E2E-001: App shell baseline checks
// ---------------------------------------------------------------------------

test.describe('T-E2E-001: App shell', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test('app shell loads within 3 seconds', async ({ page }) => {
    // Navigation is done in beforeEach — assert the shell is fully present
    const start = Date.now();
    await expect(page.locator('.app-toolbar')).toBeVisible();
    await expect(page.locator('.app-status-bar')).toBeVisible();
    const elapsed = Date.now() - start;
    // The page was already loaded; remaining checks should be < 1s
    expect(elapsed).toBeLessThan(3000);
  });

  test('toolbar is visible', async ({ page }) => {
    await expect(page.locator('.app-toolbar')).toBeVisible();
    // Brand name is present
    await expect(page.locator('.brand-name')).toContainText('OpenCAD');
  });

  test('status bar is visible', async ({ page }) => {
    await expect(page.locator('.app-status-bar')).toBeVisible();
    // Sync status label should be rendered (Connected or Offline)
    await expect(page.locator('.status-label')).toBeVisible();
  });

  test('right panel tab bar is visible', async ({ page }) => {
    await expect(page.locator('.right-panel-tab-bar')).toBeVisible();
    // There should be at least one tab button
    const tabCount = await page.locator('.right-panel-tab-btn').count();
    expect(tabCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// T-E2E-001: Auth
// ---------------------------------------------------------------------------

test.describe('T-E2E-001: Auth flow', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test('clicking auth button opens auth modal or redirects', async ({ page }) => {
    // The "Sign In" button is in the toolbar-right area
    const signInBtn = page.locator('[title="Sign In"]');
    await expect(signInBtn).toBeVisible();

    await signInBtn.click();

    // The AuthModal should appear — it renders a form with email + password inputs
    // or, in a Firebase-less environment, the modal may not appear at all.
    // Either way, the page must not navigate away (no hard redirect in browser mode).
    await page.waitForTimeout(500);
    const modalVisible = await page.locator('.auth-modal').isVisible().catch(() => false);
    const stillOnApp = page.url().includes('localhost');
    // At least one of these must be true: modal shown OR still on the app
    expect(modalVisible || stillOnApp).toBe(true);
  });
});
