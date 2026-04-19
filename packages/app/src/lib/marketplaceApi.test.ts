/**
 * Marketplace API tests
 * T-MKT-001: listPlugins() calls correct endpoint
 * T-MKT-002: installPlugin() sends auth header
 * T-MKT-003: network error → rejects with descriptive message
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listPlugins,
  installPlugin,
  uninstallPlugin,
  listInstalled,
  getPlugin,
  registerMarketplaceTokenProvider,
  type Plugin,
  type InstallResult,
} from './marketplaceApi';

expect.extend(jestDomMatchers);

// ── Helpers ───────────────────────────────────────────────────────────────────

const makePlugin = (overrides: Partial<Plugin> = {}): Plugin => ({
  id: 'plugin-1',
  name: 'Test Plugin',
  description: 'A test plugin.',
  category: 'structural',
  version: '1.0.0',
  author: 'Tester',
  rating: 4.5,
  downloadCount: 1200,
  price: 'free',
  installed: false,
  ...overrides,
});

function stubFetch(
  response: Partial<Response> & { json?: () => Promise<unknown> },
): ReturnType<typeof vi.fn> {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '',
    json: async () => [],
    ...response,
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

// ── T-MKT-001: listPlugins() calls correct endpoint ───────────────────────────

describe('T-MKT-001: listPlugins()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    registerMarketplaceTokenProvider(async () => null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the /api/v1/marketplace/plugins endpoint', async () => {
    const plugins = [makePlugin()];
    const mockFetch = stubFetch({ json: async () => plugins });

    const result = await listPlugins();

    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/\/api\/v1\/marketplace\/plugins$/);
    expect(result).toEqual(plugins);
  });

  it('appends category query param when provided', async () => {
    const mockFetch = stubFetch({ json: async () => [] });

    await listPlugins({ category: 'structural' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/category=structural/);
  });

  it('appends search query param when provided', async () => {
    const mockFetch = stubFetch({ json: async () => [] });

    await listPlugins({ search: 'energy' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/search=energy/);
  });

  it('appends both category and search when both provided', async () => {
    const mockFetch = stubFetch({ json: async () => [] });

    await listPlugins({ category: 'mep', search: 'hvac' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/category=mep/);
    expect(url).toMatch(/search=hvac/);
  });

  it('omits query string when no options provided', async () => {
    const mockFetch = stubFetch({ json: async () => [] });

    await listPlugins();

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).not.toContain('?');
  });

  it('throws on non-ok HTTP response', async () => {
    stubFetch({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server broke',
    } as Partial<Response>);

    await expect(listPlugins()).rejects.toThrow(/500/);
  });
});

// ── T-MKT-002: installPlugin() sends auth header ──────────────────────────────

describe('T-MKT-002: installPlugin() sends auth header', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization: Bearer <token> header', async () => {
    registerMarketplaceTokenProvider(async () => 'test-token-abc');
    const result: InstallResult = { pluginId: 'plugin-1', installedAt: new Date().toISOString() };
    const mockFetch = stubFetch({ json: async () => result });

    const installResult = await installPlugin('plugin-1');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-abc');
    expect(installResult).toEqual(result);
  });

  it('sends POST request to correct endpoint', async () => {
    registerMarketplaceTokenProvider(async () => null);
    const mockFetch = stubFetch({
      json: async () => ({ pluginId: 'plugin-2', installedAt: '' }),
    });

    await installPlugin('plugin-2');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/marketplace\/plugins\/plugin-2\/install$/);
    expect(init?.method).toBe('POST');
  });

  it('omits Authorization header when no token is available', async () => {
    registerMarketplaceTokenProvider(async () => null);
    const mockFetch = stubFetch({
      json: async () => ({ pluginId: 'plugin-3', installedAt: '' }),
    });

    await installPlugin('plugin-3');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('URL-encodes plugin id with special characters', async () => {
    registerMarketplaceTokenProvider(async () => null);
    const mockFetch = stubFetch({
      json: async () => ({ pluginId: 'my plugin/1', installedAt: '' }),
    });

    await installPlugin('my plugin/1');

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain(encodeURIComponent('my plugin/1'));
  });
});

// ── T-MKT-003: network error → rejects with descriptive message ───────────────

describe('T-MKT-003: network error rejects with descriptive message', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    registerMarketplaceTokenProvider(async () => null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listPlugins() rejects with "Marketplace API network error" on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    await expect(listPlugins()).rejects.toThrow(/Marketplace API network error/);
  });

  it('installPlugin() rejects with "Marketplace API network error" on connection refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(installPlugin('plugin-1')).rejects.toThrow(/Marketplace API network error/);
  });

  it('error message includes the original failure reason', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('net::ERR_NAME_NOT_RESOLVED')),
    );

    await expect(listPlugins()).rejects.toThrow(/net::ERR_NAME_NOT_RESOLVED/);
  });

  it('uninstallPlugin() rejects with descriptive message on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    await expect(uninstallPlugin('plugin-1')).rejects.toThrow(/Marketplace API network error/);
  });
});

// ── Additional coverage: getPlugin and listInstalled ─────────────────────────

describe('getPlugin()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    registerMarketplaceTokenProvider(async () => null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches single plugin by id', async () => {
    const plugin = makePlugin({ id: 'single-plugin' });
    const mockFetch = stubFetch({ json: async () => plugin });

    const result = await getPlugin('single-plugin');

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toMatch(/\/api\/v1\/marketplace\/plugins\/single-plugin$/);
    expect(result).toEqual(plugin);
  });
});

describe('listInstalled()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    registerMarketplaceTokenProvider(async () => null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /api/v1/marketplace/plugins/installed', async () => {
    const installed = [makePlugin({ installed: true })];
    const mockFetch = stubFetch({ json: async () => installed });

    const result = await listInstalled();

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toMatch(/\/api\/v1\/marketplace\/plugins\/installed$/);
    expect(result).toEqual(installed);
  });
});
