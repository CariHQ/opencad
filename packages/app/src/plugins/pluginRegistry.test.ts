/**
 * Plugin Registry Tests
 * T-PLG-001: Registry operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry, pluginRegistry } from './pluginRegistry';
import type { PluginManifest } from './pluginManifest';

const makeManifest = (id: string, overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  id,
  name: `Plugin ${id}`,
  version: '1.0.0',
  description: `Description for ${id}`,
  permissions: ['ui'],
  entrypoint: `https://cdn.example.com/${id}/index.js`,
  ...overrides,
});

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('T-PLG-001: register adds manifest and isRegistered returns true', () => {
    const manifest = makeManifest('test-plugin');
    registry.register(manifest);
    expect(registry.isRegistered('test-plugin')).toBe(true);
  });

  it('unregister removes plugin by id', () => {
    registry.register(makeManifest('plugin-a'));
    registry.unregister('plugin-a');
    expect(registry.isRegistered('plugin-a')).toBe(false);
  });

  it('unregister on a non-existent id is a no-op', () => {
    expect(() => registry.unregister('does-not-exist')).not.toThrow();
  });

  it('get returns the manifest for a registered plugin', () => {
    const manifest = makeManifest('get-plugin');
    registry.register(manifest);
    const result = registry.get('get-plugin');
    expect(result).toEqual(manifest);
  });

  it('get returns undefined for an unregistered plugin', () => {
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('list returns all registered plugins', () => {
    registry.register(makeManifest('p1'));
    registry.register(makeManifest('p2'));
    registry.register(makeManifest('p3'));
    const list = registry.list();
    expect(list.length).toBe(3);
    expect(list.map((m) => m.id)).toContain('p1');
    expect(list.map((m) => m.id)).toContain('p2');
    expect(list.map((m) => m.id)).toContain('p3');
  });

  it('list returns empty array when no plugins are registered', () => {
    expect(registry.list()).toEqual([]);
  });

  it('registering the same id twice overwrites the previous entry', () => {
    registry.register(makeManifest('dup', { name: 'First' }));
    registry.register(makeManifest('dup', { name: 'Second' }));
    expect(registry.list().length).toBe(1);
    expect(registry.get('dup')!.name).toBe('Second');
  });

  it('isRegistered returns false for unknown id', () => {
    expect(registry.isRegistered('not-there')).toBe(false);
  });
});

describe('pluginRegistry singleton', () => {
  it('is an instance of PluginRegistry', () => {
    expect(pluginRegistry).toBeInstanceOf(PluginRegistry);
  });
});
