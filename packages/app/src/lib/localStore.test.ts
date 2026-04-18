/**
 * T-OFF-001: Offline-first auto-save — localStorage-backed OfflineStore tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, beforeEach } from 'vitest';

expect.extend(jestDomMatchers);

import { createOfflineStore } from './localStore';

beforeEach(() => {
  localStorage.clear();
});

describe('T-OFF-001: OfflineStore (localStorage)', () => {
  it('T-OFF-001-001: save and load round-trips correctly', async () => {
    const store = createOfflineStore('test-db');
    await store.save('key1', 'hello');
    const value = await store.load('key1');
    expect(value).toBe('hello');
  });

  it('T-OFF-001-002: load returns null for missing key', async () => {
    const store = createOfflineStore('test-db');
    const value = await store.load('nonexistent');
    expect(value).toBeNull();
  });

  it('T-OFF-001-003: keys() returns all saved keys', async () => {
    const store = createOfflineStore('test-db');
    await store.save('alpha', 1);
    await store.save('beta', 2);
    await store.save('gamma', 3);
    const keys = await store.keys();
    expect(keys).toContain('alpha');
    expect(keys).toContain('beta');
    expect(keys).toContain('gamma');
    expect(keys).toHaveLength(3);
  });

  it('T-OFF-001-004: delete removes the key', async () => {
    const store = createOfflineStore('test-db');
    await store.save('toDelete', 'value');
    await store.delete('toDelete');
    const value = await store.load('toDelete');
    expect(value).toBeNull();
  });

  it('T-OFF-001-005: save handles objects (JSON serialisation)', async () => {
    const store = createOfflineStore('test-db');
    const obj = { name: 'project', elements: [1, 2, 3], nested: { a: true } };
    await store.save('obj-key', obj);
    const loaded = await store.load('obj-key');
    expect(loaded).toEqual(obj);
  });

  it('T-OFF-001-006: load returns correct type after save', async () => {
    const store = createOfflineStore('test-db');
    await store.save('num', 42);
    await store.save('bool', true);
    await store.save('arr', [1, 2, 3]);

    const num = await store.load('num');
    const bool = await store.load('bool');
    const arr = await store.load('arr');

    expect(num).toBe(42);
    expect(bool).toBe(true);
    expect(arr).toEqual([1, 2, 3]);
  });
});
