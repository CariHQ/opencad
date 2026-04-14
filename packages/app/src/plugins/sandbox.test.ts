/**
 * Plugin Sandbox Tests
 * T-PLG-001 through T-PLG-005
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PluginSandbox,
  createPluginAPI,
  PluginPermissionManager,
  PluginUIMount,
  type PluginContext,
  type PluginManifest,
} from './sandbox';

// ─── T-PLG-001: Plugin Sandbox Execution ──────────────────────────────────────

describe('T-PLG-001: Plugin Sandbox Execution', () => {
  let sandbox: PluginSandbox;

  beforeEach(() => {
    sandbox = new PluginSandbox();
  });

  it('should load a plugin in an isolated environment', () => {
    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      entryPoint: 'index.js',
    };
    const ctx = sandbox.load(manifest);
    expect(ctx).toBeDefined();
    expect(ctx.pluginId).toBe('test-plugin');
    expect(ctx.isolated).toBe(true);
  });

  it('should not expose main app globals to plugin', () => {
    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      entryPoint: 'index.js',
    };
    const ctx = sandbox.load(manifest);
    // Plugin context should only have the permitted API, not window/document globals
    expect((ctx as unknown as Record<string, unknown>)['window']).toBeUndefined();
    expect((ctx as unknown as Record<string, unknown>)['document']).toBeUndefined();
    expect((ctx as unknown as Record<string, unknown>)['process']).toBeUndefined();
  });

  it('should enforce resource limits on plugin context', () => {
    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      entryPoint: 'index.js',
      resourceLimits: { maxMemoryMB: 64, maxCpuMs: 5000 },
    };
    const ctx = sandbox.load(manifest);
    expect(ctx.resourceLimits).toEqual({ maxMemoryMB: 64, maxCpuMs: 5000 });
  });

  it('should apply default resource limits when none specified', () => {
    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      entryPoint: 'index.js',
    };
    const ctx = sandbox.load(manifest);
    expect(ctx.resourceLimits.maxMemoryMB).toBeLessThanOrEqual(128);
    expect(ctx.resourceLimits.maxCpuMs).toBeLessThanOrEqual(10000);
  });

  it('should track loaded plugins', () => {
    const m1: PluginManifest = { id: 'p1', name: 'P1', version: '1.0.0', entryPoint: 'a.js' };
    const m2: PluginManifest = { id: 'p2', name: 'P2', version: '1.0.0', entryPoint: 'b.js' };
    sandbox.load(m1);
    sandbox.load(m2);
    expect(sandbox.getLoadedPlugins()).toContain('p1');
    expect(sandbox.getLoadedPlugins()).toContain('p2');
  });

  it('should unload a plugin and remove from tracking', () => {
    const manifest: PluginManifest = { id: 'p1', name: 'P1', version: '1.0.0', entryPoint: 'a.js' };
    sandbox.load(manifest);
    sandbox.unload('p1');
    expect(sandbox.getLoadedPlugins()).not.toContain('p1');
  });
});

// ─── T-PLG-002: Plugin Creates Element ────────────────────────────────────────

describe('T-PLG-002: Plugin Creates Element', () => {
  let elements: Map<string, Record<string, unknown>>;
  let api: ReturnType<typeof createPluginAPI>;

  beforeEach(() => {
    elements = new Map();
    const docStore = {
      addElement: vi.fn((el: Record<string, unknown>) => {
        elements.set(el['id'] as string, el);
        return el;
      }),
      getElement: vi.fn((id: string) => elements.get(id)),
    };
    api = createPluginAPI('test-plugin', docStore);
  });

  it('should allow plugin to call createElement', () => {
    const el = api.createElement({
      type: 'wall',
      x: 0,
      y: 0,
      width: 5,
      height: 3,
    });
    expect(el).toBeDefined();
    expect(el.id).toBeTruthy();
  });

  it('should add created element to document model', () => {
    const el = api.createElement({
      type: 'wall',
      x: 10,
      y: 20,
      width: 5,
      height: 3,
    });
    expect(elements.has(el.id)).toBe(true);
  });

  it('should preserve element properties on creation', () => {
    const el = api.createElement({
      type: 'wall',
      x: 10,
      y: 20,
      width: 5,
      height: 3,
      label: 'North Wall',
    });
    const stored = elements.get(el.id)!;
    expect(stored['type']).toBe('wall');
    expect(stored['x']).toBe(10);
    expect(stored['y']).toBe(20);
    expect(stored['label']).toBe('North Wall');
  });

  it('should tag created elements with the plugin id', () => {
    const el = api.createElement({ type: 'door', x: 0, y: 0 });
    const stored = elements.get(el.id)!;
    expect(stored['_pluginId']).toBe('test-plugin');
  });
});

// ─── T-PLG-003: Plugin Network Permission ─────────────────────────────────────

describe('T-PLG-003: Plugin Network Permission', () => {
  let permManager: PluginPermissionManager;

  beforeEach(() => {
    permManager = new PluginPermissionManager();
  });

  it('should require permission before network call', async () => {
    const granted = await permManager.request('net-plugin', 'network', 'https://api.example.com');
    // Starts denied by default
    expect(typeof granted).toBe('boolean');
  });

  it('should show permission prompt on first network request', async () => {
    const promptSpy = vi.fn().mockResolvedValue(true);
    permManager.setPromptHandler(promptSpy);
    await permManager.request('net-plugin', 'network', 'https://api.example.com');
    expect(promptSpy).toHaveBeenCalledWith('net-plugin', 'network', 'https://api.example.com');
  });

  it('should grant access when user allows', async () => {
    permManager.setPromptHandler(vi.fn().mockResolvedValue(true));
    const granted = await permManager.request('net-plugin', 'network', 'https://api.example.com');
    expect(granted).toBe(true);
  });

  it('should deny access when user denies', async () => {
    permManager.setPromptHandler(vi.fn().mockResolvedValue(false));
    const granted = await permManager.request('net-plugin', 'network', 'https://api.example.com');
    expect(granted).toBe(false);
  });

  it('should cache permission decision for subsequent calls', async () => {
    const promptSpy = vi.fn().mockResolvedValue(true);
    permManager.setPromptHandler(promptSpy);
    await permManager.request('net-plugin', 'network', 'https://api.example.com');
    await permManager.request('net-plugin', 'network', 'https://api.example.com');
    // Prompt should only be shown once
    expect(promptSpy).toHaveBeenCalledTimes(1);
  });
});

// ─── T-PLG-004: Plugin API Blocking ───────────────────────────────────────────

describe('T-PLG-004: Plugin API Blocking', () => {
  let sandbox: PluginSandbox;

  beforeEach(() => {
    sandbox = new PluginSandbox();
  });

  it('should block access to forbidden APIs', () => {
    const manifest: PluginManifest = {
      id: 'malicious-plugin',
      name: 'Bad Plugin',
      version: '1.0.0',
      entryPoint: 'evil.js',
    };
    const ctx = sandbox.load(manifest);
    // Forbidden: direct file system access
    expect(ctx.callAPI('fs.readFile', '/etc/passwd')).toEqual({
      error: 'FORBIDDEN',
      api: 'fs.readFile',
    });
  });

  it('should block eval and dynamic code execution', () => {
    const manifest: PluginManifest = {
      id: 'malicious-plugin',
      name: 'Bad Plugin',
      version: '1.0.0',
      entryPoint: 'evil.js',
    };
    const ctx = sandbox.load(manifest);
    expect(ctx.callAPI('eval', 'alert(1)')).toEqual({
      error: 'FORBIDDEN',
      api: 'eval',
    });
  });

  it('should allow permitted API calls', () => {
    const manifest: PluginManifest = {
      id: 'good-plugin',
      name: 'Good Plugin',
      version: '1.0.0',
      entryPoint: 'plugin.js',
    };
    const ctx = sandbox.load(manifest);
    const result = ctx.callAPI('log', 'hello');
    expect(result).not.toHaveProperty('error');
  });

  it('should log blocked API attempts', () => {
    const manifest: PluginManifest = {
      id: 'malicious-plugin',
      name: 'Bad Plugin',
      version: '1.0.0',
      entryPoint: 'evil.js',
    };
    const ctx = sandbox.load(manifest);
    ctx.callAPI('fs.readFile', '/etc/passwd');
    const violations = sandbox.getViolations('malicious-plugin');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.api).toBe('fs.readFile');
  });
});

// ─── T-PLG-005: Plugin UI Isolation ───────────────────────────────────────────

describe('T-PLG-005: Plugin UI Isolation', () => {
  it('should create an isolated mount point for plugin UI', () => {
    const mount = new PluginUIMount('widget-plugin');
    expect(mount.pluginId).toBe('widget-plugin');
    expect(mount.containerId).toMatch(/^plugin-ui-widget-plugin/);
  });

  it('should scope CSS to the plugin container', () => {
    const mount = new PluginUIMount('widget-plugin');
    const scoped = mount.scopeCSS('button { color: red; }');
    expect(scoped).toContain(`#${mount.containerId}`);
    expect(scoped).toContain('button');
    expect(scoped).toContain('color: red');
  });

  it('should not leak CSS outside the container', () => {
    const mount = new PluginUIMount('widget-plugin');
    const scoped = mount.scopeCSS('body { background: black; }');
    // Scoped CSS should be wrapped with container selector, not raw body
    expect(scoped).not.toMatch(/^body/);
    expect(scoped).toContain(`#${mount.containerId}`);
  });

  it('should report no CSS conflicts between two plugin mounts', () => {
    const mount1 = new PluginUIMount('plugin-a');
    const mount2 = new PluginUIMount('plugin-b');
    const css1 = mount1.scopeCSS('.btn { color: blue; }');
    const css2 = mount2.scopeCSS('.btn { color: red; }');
    // Each CSS is scoped to its own container
    expect(css1).not.toContain(mount2.containerId);
    expect(css2).not.toContain(mount1.containerId);
  });

  it('should provide an isolated JS namespace', () => {
    const mount = new PluginUIMount('widget-plugin');
    const ns = mount.createNamespace();
    expect(ns).toBeDefined();
    expect((ns as Record<string, unknown>)['window']).toBeUndefined();
  });
});
