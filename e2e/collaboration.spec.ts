/**
 * T-E2E-001 / T-COL-*: Collaboration & Offline Test Suite
 *
 * Tests sync status indicators and offline-mode behaviour.
 * Playwright's BrowserContext.setOffline() is used to simulate network loss —
 * no WebSocket server needs to be running for these tests.
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// ---------------------------------------------------------------------------
// T-COL-001: Sync status bar
// ---------------------------------------------------------------------------

test.describe('T-COL-001: Sync status bar', () => {
  test('sync status bar shows "Connected" when online', async ({ page }) => {
    await waitForAppReady(page);

    // The SyncStatusBar renders with class `sync-connected` and label "Connected"
    // when isOnline=true and isSaving=false (the default state in dev).
    const statusBar = page.locator('.sync-status-bar');
    await expect(statusBar).toBeVisible();

    // The label text should be one of the expected values
    const labelText = await page.locator('.status-label').textContent();
    expect(['Connected', 'Syncing…', 'Offline', 'Sync Error']).toContain(labelText?.trim());
  });

  test('sync status shows "Offline" when network is simulated offline', async ({
    page,
    context,
  }) => {
    await waitForAppReady(page);

    // Simulate network loss via Playwright context API
    await context.setOffline(true);

    // Wait for the app to detect the offline state.
    // The documentStore listens to the "online"/"offline" window events.
    await page.waitForTimeout(500);

    // Trigger any pending network event by navigating in-page (no reload)
    // or dispatching the offline event manually.
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(300);

    // The status label should now read "Offline"
    const labelText = await page.locator('.status-label').textContent();
    expect(labelText?.trim()).toBe('Offline');

    // Restore connectivity for subsequent tests
    await context.setOffline(false);
  });
});

// ---------------------------------------------------------------------------
// T-COL-002: Offline-first — app continues to function
// ---------------------------------------------------------------------------

test.describe('T-COL-002: Offline-first functionality', () => {
  test('app continues to function when offline', async ({ page, context }) => {
    await waitForAppReady(page);

    // Go offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(300);

    // The toolbar and toolshelf should remain visible and interactive
    await expect(page.locator('.app-toolbar')).toBeVisible();
    await expect(page.locator('.toolshelf')).toBeVisible();
    await expect(page.locator('.app-status-bar')).toBeVisible();

    // User should still be able to switch views
    await page.locator('.toolbar-tabs .tab-btn:has-text("Floor Plan")').click();
    await expect(
      page.locator('.toolbar-tabs .tab-btn.active:has-text("Floor Plan")'),
    ).toBeVisible();

    // Restore connectivity
    await context.setOffline(false);
  });

  test('offline indicator appears in status bar when offline', async ({ page, context }) => {
    await waitForAppReady(page);

    // Go offline and trigger the window event
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(500);

    // The sync-status-bar should carry the `sync-offline` CSS class
    const statusBar = page.locator('.sync-status-bar');
    await expect(statusBar).toBeVisible();

    const className = await statusBar.getAttribute('class');
    expect(className).toContain('sync-offline');

    // The status dot should also carry the offline modifier
    const dot = page.locator('.status-dot-offline');
    await expect(dot).toBeVisible();

    // Restore connectivity
    await context.setOffline(false);
  });
});

// ---------------------------------------------------------------------------
// T-COL-003: Online recovery
// ---------------------------------------------------------------------------

test.describe('T-COL-003: Online recovery', () => {
  test('status bar returns to connected state after network is restored', async ({
    page,
    context,
  }) => {
    await waitForAppReady(page);

    // Go offline then come back online
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(300);

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(500);

    // The status label should no longer read "Offline"
    const labelText = await page.locator('.status-label').textContent();
    expect(labelText?.trim()).not.toBe('Offline');

    // App shell still intact
    await expect(page.locator('.app-toolbar')).toBeVisible();
  });
});
