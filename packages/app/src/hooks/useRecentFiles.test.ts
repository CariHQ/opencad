/**
 * Recent Files Hook Tests
 * Issue #2: IFC import/export file dialogs — recent files list
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecentFilesStore } from './useRecentFiles';

describe('Issue #2: Recent files for IFC dialogs', () => {
  let store: RecentFilesStore;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
    store = new RecentFilesStore({
      get: (key: string) => mockStorage.get(key) ?? null,
      set: (key: string, value: string) => { mockStorage.set(key, value); },
    });
  });

  it('should start with empty recent files', () => {
    expect(store.getFiles()).toEqual([]);
  });

  it('should add a file to recent files', () => {
    store.addFile({ name: 'building.ifc', path: '/tmp/building.ifc', format: 'ifc' });
    expect(store.getFiles()).toHaveLength(1);
    expect(store.getFiles()[0]!.name).toBe('building.ifc');
  });

  it('should persist recent files to storage', () => {
    store.addFile({ name: 'plan.ifc', path: '/tmp/plan.ifc', format: 'ifc' });
    const reloaded = new RecentFilesStore({
      get: (key: string) => mockStorage.get(key) ?? null,
      set: (key: string, value: string) => { mockStorage.set(key, value); },
    });
    expect(reloaded.getFiles()[0]!.name).toBe('plan.ifc');
  });

  it('should limit recent files to 10', () => {
    for (let i = 0; i < 15; i++) {
      store.addFile({ name: `file${i}.ifc`, path: `/tmp/file${i}.ifc`, format: 'ifc' });
    }
    expect(store.getFiles().length).toBeLessThanOrEqual(10);
  });

  it('should move file to top on re-add', () => {
    store.addFile({ name: 'a.ifc', path: '/a.ifc', format: 'ifc' });
    store.addFile({ name: 'b.ifc', path: '/b.ifc', format: 'ifc' });
    store.addFile({ name: 'a.ifc', path: '/a.ifc', format: 'ifc' }); // re-open
    expect(store.getFiles()[0]!.name).toBe('a.ifc');
    expect(store.getFiles()).toHaveLength(2);
  });

  it('should remove a file from recent files', () => {
    store.addFile({ name: 'del.ifc', path: '/del.ifc', format: 'ifc' });
    store.removeFile('/del.ifc');
    expect(store.getFiles()).toHaveLength(0);
  });

  it('should include a timestamp on each file entry', () => {
    const before = Date.now();
    store.addFile({ name: 'ts.ifc', path: '/ts.ifc', format: 'ifc' });
    expect(store.getFiles()[0]!.lastOpened).toBeGreaterThanOrEqual(before);
  });
});
