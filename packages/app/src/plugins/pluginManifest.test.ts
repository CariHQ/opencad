/**
 * Plugin Manifest Tests
 * T-PLG-001: Manifest validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateManifest,
  MANIFEST_REQUIRED_FIELDS,
  type PluginManifest,
} from './pluginManifest';

describe('T-PLG-001: PluginManifest validation', () => {
  const validManifest: PluginManifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    permissions: ['ui', 'document'],
    entrypoint: 'https://cdn.example.com/plugin/index.js',
  };

  it('T-PLG-001: validateManifest returns true for a valid manifest', () => {
    expect(validateManifest(validManifest)).toBe(true);
  });

  it('returns false for missing id', () => {
    const { id: _id, ...rest } = validManifest;
    expect(validateManifest(rest)).toBe(false);
  });

  it('returns false for missing name', () => {
    const { name: _name, ...rest } = validManifest;
    expect(validateManifest(rest)).toBe(false);
  });

  it('returns false for missing version', () => {
    const { version: _version, ...rest } = validManifest;
    expect(validateManifest(rest)).toBe(false);
  });

  it('returns false for missing description', () => {
    const { description: _description, ...rest } = validManifest;
    expect(validateManifest(rest)).toBe(false);
  });

  it('returns false for missing permissions', () => {
    const { permissions: _permissions, ...rest } = validManifest;
    expect(validateManifest(rest)).toBe(false);
  });

  it('returns false for missing entrypoint', () => {
    const { entrypoint: _entrypoint, ...rest } = validManifest;
    expect(validateManifest(rest)).toBe(false);
  });

  it('returns false for null input', () => {
    expect(validateManifest(null)).toBe(false);
  });

  it('returns false for non-object input', () => {
    expect(validateManifest('string')).toBe(false);
    expect(validateManifest(42)).toBe(false);
    expect(validateManifest(undefined)).toBe(false);
  });

  it('MANIFEST_REQUIRED_FIELDS contains all required fields', () => {
    expect(MANIFEST_REQUIRED_FIELDS).toContain('id');
    expect(MANIFEST_REQUIRED_FIELDS).toContain('name');
    expect(MANIFEST_REQUIRED_FIELDS).toContain('version');
    expect(MANIFEST_REQUIRED_FIELDS).toContain('description');
    expect(MANIFEST_REQUIRED_FIELDS).toContain('permissions');
    expect(MANIFEST_REQUIRED_FIELDS).toContain('entrypoint');
  });

  it('accepts valid permission values', () => {
    const manifest: PluginManifest = {
      ...validManifest,
      permissions: ['network', 'storage', 'ui', 'document'],
    };
    expect(validateManifest(manifest)).toBe(true);
  });

  it('acts as a type guard — narrows unknown to PluginManifest', () => {
    const unknown: unknown = validManifest;
    if (validateManifest(unknown)) {
      // TypeScript should accept this — the type guard narrowed the type
      expect(unknown.id).toBe('my-plugin');
    } else {
      throw new Error('Expected valid manifest to pass validation');
    }
  });
});
