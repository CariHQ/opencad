/**
 * E2E Test Helpers
 *
 * Shared utilities for Playwright test suites. Import from this module to
 * keep individual spec files concise and avoid duplicated setup logic.
 */

import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Navigate to a project view and wait for the full app shell to be ready.
 * Uses `/project/default` which the ProjectDashboard creates automatically.
 * If you already have a specific project ID, pass it as the second argument.
 */
export async function waitForAppReady(page: Page, projectPath = '/project/default'): Promise<void> {
  await page.goto(projectPath, { waitUntil: 'networkidle' });

  // Wait for the two anchors that confirm the full shell has rendered
  await page.waitForSelector('.app-toolbar', { timeout: 15000 });
  await page.waitForSelector('.app-status-bar', { timeout: 10000 });
  await page.waitForSelector('.toolshelf', { timeout: 10000 });
}

/**
 * Activate a drawing/structure tool by its tool-id.
 * Clicks the category button first if needed (the shelf only shows tools in
 * the active category), then clicks the tool button.
 *
 * @param page       - Playwright page object
 * @param toolName   - The `title` attribute value on the tool button, e.g. "Wall (W)"
 */
export async function activateTool(page: Page, toolName: string): Promise<void> {
  // Tool buttons carry a title like "Wall (W)" or "Line (L)"
  const toolButton = page.locator(`.tool-btn[title^="${toolName}"]`).first();

  // If the button is not visible the category is not active — try clicking
  // the matching category tab first
  const isVisible = await toolButton.isVisible().catch(() => false);
  if (!isVisible) {
    // Derive the category from the tool name by clicking through all categories
    const categoryButtons = page.locator('.category-btn');
    const count = await categoryButtons.count();
    for (let i = 0; i < count; i++) {
      await categoryButtons.nth(i).click();
      const found = await page.locator(`.tool-btn[title^="${toolName}"]`).isVisible().catch(() => false);
      if (found) break;
    }
  }

  await page.locator(`.tool-btn[title^="${toolName}"]`).first().click();
}

/**
 * Simulate a drag on the canvas to draw a rectangle-like element.
 *
 * @param page   - Playwright page object
 * @param canvas - Locator for the canvas element
 * @param x1     - Start X coordinate (relative to canvas bounding box)
 * @param y1     - Start Y coordinate
 * @param x2     - End X coordinate
 * @param y2     - End Y coordinate
 */
export async function drawRectangle(
  page: Page,
  canvas: Locator,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Promise<void> {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box is null — is the canvas visible?');

  const absX1 = box.x + x1;
  const absY1 = box.y + y1;
  const absX2 = box.x + x2;
  const absY2 = box.y + y2;

  await page.mouse.move(absX1, absY1);
  await page.mouse.down();
  await page.mouse.move(absX2, absY2, { steps: 10 });
  await page.mouse.up();
}

/**
 * Click the "3D View" toolbar tab to switch the viewport.
 */
export async function switchTo3D(page: Page): Promise<void> {
  await page.locator('.toolbar-tabs .tab-btn:has-text("3D View")').click();
  // Give Three.js a moment to initialise
  await page.waitForTimeout(300);
}

/**
 * Open a specific tab in the right panel by its title (aria-label).
 *
 * @param page    - Playwright page object
 * @param tabName - The `title` / `aria-label` on the right-panel tab button, e.g. "Layers"
 */
export async function openRightPanel(page: Page, tabName: string): Promise<void> {
  // Ensure the right panel is visible first
  const rightPanel = page.locator('.app-right-panel');
  const isPanelCollapsed = await rightPanel.evaluate(
    (el) => el.classList.contains('panel-collapsed'),
  );
  if (isPanelCollapsed) {
    await page.locator('[title="Toggle properties (⌘])"]').click();
  }

  await page.locator(`.right-panel-tab-btn[aria-label="${tabName}"]`).click();
  await expect(page.locator('.right-panel-content')).toBeVisible();
}
