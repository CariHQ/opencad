/**
 * T-DSK-012: Auto-update via Tauri updater plugin
 * Tests for checkForUpdates() function in useTauri.ts
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('T-DSK-012: checkForUpdates()', () => {
  const mockInvoke = vi.fn();

  beforeEach(() => {
    (window as Window & { __TAURI__?: { core: { invoke: typeof mockInvoke } } }).__TAURI__ = {
      core: { invoke: mockInvoke },
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
  });

  it('exports checkForUpdates as a function', async () => {
    const { checkForUpdates } = await import('./useTauri');
    expect(typeof checkForUpdates).toBe('function');
  });

  it('calls plugin:updater|check via invoke', async () => {
    const updateInfo = { version: '2.0.0', body: 'Bug fixes', date: '2024-01-15' };
    mockInvoke.mockResolvedValue(updateInfo);
    const { checkForUpdates } = await import('./useTauri');
    const result = await checkForUpdates();
    expect(mockInvoke).toHaveBeenCalledWith('plugin:updater|check');
    expect(result).toEqual(updateInfo);
  });

  it('returns null when not in Tauri environment', async () => {
    delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
    const { checkForUpdates } = await import('./useTauri');
    const result = await checkForUpdates();
    expect(result).toBeNull();
  });

  it('returns null when updater plugin throws', async () => {
    mockInvoke.mockRejectedValue(new Error('updater plugin not available'));
    const { checkForUpdates } = await import('./useTauri');
    const result = await checkForUpdates();
    expect(result).toBeNull();
  });

  it('returns update info with correct shape when update is available', async () => {
    const updateInfo = {
      version: '1.5.2',
      body: 'New features and fixes',
      date: '2024-03-20T12:00:00Z',
    };
    mockInvoke.mockResolvedValue(updateInfo);
    const { checkForUpdates } = await import('./useTauri');
    const result = await checkForUpdates();
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.5.2');
    expect(result!.body).toBe('New features and fixes');
    expect(result!.date).toBe('2024-03-20T12:00:00Z');
  });
});
