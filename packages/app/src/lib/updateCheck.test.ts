/**
 * updateCheck tests
 * T-DSK-012-001 through T-DSK-012-006
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkForUpdate } from './updateCheck';

describe('T-DSK-012: checkForUpdate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T-DSK-012-001
  it('returns available:true when server version > current', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ version: '1.1.0', notes: 'Bug fixes', downloadUrl: 'https://example.com/download' }),
      }),
    );

    const result = await checkForUpdate('1.0.0');

    expect(result.available).toBe(true);
    expect(result.version).toBe('1.1.0');
    expect(result.notes).toBe('Bug fixes');
    expect(result.downloadUrl).toBe('https://example.com/download');
  });

  // T-DSK-012-002
  it('returns available:false when same version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ version: '1.0.0', notes: '', downloadUrl: '' }),
      }),
    );

    const result = await checkForUpdate('1.0.0');

    expect(result.available).toBe(false);
  });

  // T-DSK-012-003
  it('returns available:false when server version older', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ version: '0.9.0', notes: '', downloadUrl: '' }),
      }),
    );

    const result = await checkForUpdate('1.0.0');

    expect(result.available).toBe(false);
  });

  // T-DSK-012-004
  it('returns available:false when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await checkForUpdate('1.0.0');

    expect(result.available).toBe(false);
  });

  // T-DSK-012-005
  it('calls the correct endpoint URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ version: '1.0.0', notes: '', downloadUrl: '' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await checkForUpdate('1.0.0');

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/releases/latest');
  });

  // T-DSK-012-006
  it('version comparison handles semver correctly (1.2.3 vs 1.10.0)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ version: '1.10.0', notes: '', downloadUrl: '' }),
      }),
    );

    // 1.10.0 should be newer than 1.2.3
    const result = await checkForUpdate('1.2.3');

    expect(result.available).toBe(true);
    expect(result.version).toBe('1.10.0');
  });
});
