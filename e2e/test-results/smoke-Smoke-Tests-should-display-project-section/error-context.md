# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Smoke Tests >> should display project section
- Location: smoke.spec.ts:15:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | /**
  2  |  * Smoke Test Suite
  3  |  * Quick sanity checks for CI/CD pipeline
  4  |  */
  5  | 
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('Smoke Tests', () => {
  9  |   test('should load the application', async ({ page }) => {
  10 |     await page.goto('/');
  11 | 
  12 |     await expect(page.locator('h1')).toContainText('OpenCAD');
  13 |   });
  14 | 
  15 |   test('should display project section', async ({ page }) => {
> 16 |     await page.goto('/');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  17 | 
  18 |     await expect(page.locator('.project-section h2')).toContainText('Project');
  19 |     await expect(page.locator('.project-info')).toBeVisible();
  20 |   });
  21 | 
  22 |   test('should have functional layer creation', async ({ page }) => {
  23 |     await page.goto('/');
  24 | 
  25 |     const initialCount = await page.locator('.layers-section .item').count();
  26 |     await page.click('.layers-section button');
  27 |     const newCount = await page.locator('.layers-section .item').count();
  28 | 
  29 |     expect(newCount).toBe(initialCount + 1);
  30 |   });
  31 | 
  32 |   test('should have functional element creation', async ({ page }) => {
  33 |     await page.goto('/');
  34 | 
  35 |     const initialCount = await page.locator('.elements-section .item').count();
  36 |     await page.click('.elements-section button');
  37 |     const newCount = await page.locator('.elements-section .item').count();
  38 | 
  39 |     expect(newCount).toBe(initialCount + 1);
  40 |   });
  41 | 
  42 |   test('should update project name', async ({ page }) => {
  43 |     await page.goto('/');
  44 | 
  45 |     await page.fill('.input-group input', 'New Project Name');
  46 |     await page.click('.input-group button');
  47 | 
  48 |     await expect(page.locator('.project-info')).toContainText('New Project Name');
  49 |   });
  50 | });
  51 | 
```