/**
 * Smoke Test Suite
 * Quick sanity checks for CI/CD pipeline
 */

import { test, expect } from '@playwright/test';

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
