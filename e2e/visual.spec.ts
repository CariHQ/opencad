/**
 * T-VIS: Visual Regression Tests
 *
 * Uses Playwright screenshot comparison to catch unintended UI regressions.
 *
 * FIRST RUN: generates snapshot baselines in e2e/visual.spec.ts-snapshots/
 * SUBSEQUENT RUNS: compares against baselines (diff threshold: 0.1%)
 *
 * To update baselines after intentional UI changes:
 *   pnpm test:e2e --update-snapshots
 */

import { test, expect } from '@playwright/test';

const VIEWPORT = { width: 1440, height: 900 };

test.use({ viewport: VIEWPORT });

test.describe('T-VIS-001: App shell layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully hydrate
    await page.waitForSelector('.app-toolbar', { timeout: 10000 });
    await page.waitForSelector('.navigator', { timeout: 5000 });
    // Give Three.js / canvas time to initialize
    await page.waitForTimeout(500);
  });

  test('light theme — default 3D view', async ({ page }) => {
    await expect(page).toHaveScreenshot('app-light-3d.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('dark theme', async ({ page }) => {
    // Toggle to dark by clicking the theme button
    await page.click('[title="Toggle Theme"]');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('app-dark-3d.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('floor plan view', async ({ page }) => {
    await page.click('button:has-text("Floor Plan")');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('app-light-floor-plan.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('section view', async ({ page }) => {
    await page.click('button:has-text("Section")');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('app-light-section.png', {
      maxDiffPixelRatio: 0.005,
    });
  });
});

test.describe('T-VIS-002: Panels and overlays', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-toolbar', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('AI chat panel open', async ({ page }) => {
    await page.click('[title="AI Assistant"]');
    await page.waitForSelector('.ai-chat-panel', { timeout: 3000 });
    await expect(page).toHaveScreenshot('app-ai-chat-open.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('import modal', async ({ page }) => {
    await page.click('[title="Import IFC"]');
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });
    await expect(page).toHaveScreenshot('app-import-modal.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('export modal', async ({ page }) => {
    await page.click('[title="Export IFC"]');
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });
    await expect(page).toHaveScreenshot('app-export-modal.png', {
      maxDiffPixelRatio: 0.005,
    });
  });
});

test.describe('T-VIS-003: ToolShelf interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.toolshelf', { timeout: 10000 });
  });

  test('toolshelf default state', async ({ page }) => {
    const toolshelf = page.locator('.app-toolshelf-container');
    await expect(toolshelf).toHaveScreenshot('toolshelf-default.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('toolshelf draw category selected', async ({ page }) => {
    await page.click('.toolshelf .category-btn[title="Draw"]');
    await page.waitForTimeout(100);
    const toolshelf = page.locator('.app-toolshelf-container');
    await expect(toolshelf).toHaveScreenshot('toolshelf-draw-category.png', {
      maxDiffPixelRatio: 0.005,
    });
  });
});

test.describe('T-VIS-004: Status bar states', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-status-bar', { timeout: 10000 });
  });

  test('status bar online state', async ({ page }) => {
    const statusBar = page.locator('.app-status-bar');
    await expect(statusBar).toHaveScreenshot('status-bar-online.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
