/**
 * T-OFF-002: Offline edit → persisted to IndexedDB — offlineStore tests
 *
 * Verifies:
 * - saveDocument(projectId, data) stores to IndexedDB
 * - loadDocument(projectId) retrieves stored data
 * - listPendingSync() returns projects edited while offline
 * - markSynced(projectId) removes from pending list
 * - All functions return Promises
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, beforeEach, vi } from 'vitest';

expect.extend(jestDomMatchers);

// Mock idb so tests run in jsdom without a real IndexedDB
const mockStore: Map<string, { projectId: string; data: string; pendingSync: boolean; savedAt: number }> = new Map();

const mockDb = {
  put: vi.fn(async (_store: string, record: { projectId: string; data: string; pendingSync: boolean; savedAt: number }) => {
    mockStore.set(record.projectId, record);
  }),
  get: vi.fn(async (_store: string, key: string) => {
    return mockStore.get(key) ?? undefined;
  }),
  getAll: vi.fn(async (_store: string) => {
    return Array.from(mockStore.values());
  }),
  delete: vi.fn(async (_store: string, key: string) => {
    mockStore.delete(key);
  }),
};

vi.mock('idb', () => ({
  openDB: vi.fn(async () => mockDb),
}));

// Import after mocking
import { saveDocument, loadDocument, listPendingSync, markSynced } from './offlineStore';

beforeEach(() => {
  mockStore.clear();
  mockDb.put.mockClear();
  mockDb.get.mockClear();
  mockDb.getAll.mockClear();
  mockDb.delete.mockClear();
});

describe('T-OFF-002: offlineStore', () => {
  describe('saveDocument', () => {
    it('returns a Promise', () => {
      const result = saveDocument('proj-1', '{"name":"test"}');
      expect(result).toBeInstanceOf(Promise);
    });

    it('stores data to IndexedDB with pendingSync=true', async () => {
      await saveDocument('proj-1', '{"name":"test"}');
      expect(mockDb.put).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          projectId: 'proj-1',
          data: '{"name":"test"}',
          pendingSync: true,
        })
      );
    });

    it('includes a savedAt timestamp', async () => {
      const before = Date.now();
      await saveDocument('proj-2', '{}');
      const after = Date.now();
      const call = mockDb.put.mock.calls[0];
      const record = call[1] as { savedAt: number };
      expect(record.savedAt).toBeGreaterThanOrEqual(before);
      expect(record.savedAt).toBeLessThanOrEqual(after);
    });

    it('resolves without throwing', async () => {
      await expect(saveDocument('proj-3', 'data')).resolves.not.toThrow();
    });
  });

  describe('loadDocument', () => {
    it('returns a Promise', () => {
      const result = loadDocument('proj-1');
      expect(result).toBeInstanceOf(Promise);
    });

    it('returns null when no document found', async () => {
      mockDb.get.mockResolvedValueOnce(undefined);
      const result = await loadDocument('nonexistent');
      expect(result).toBeNull();
    });

    it('retrieves stored document data', async () => {
      const record = { projectId: 'proj-5', data: '{"name":"retrieved"}', pendingSync: true, savedAt: Date.now() };
      mockDb.get.mockResolvedValueOnce(record);
      const result = await loadDocument('proj-5');
      expect(result).toBe('{"name":"retrieved"}');
    });

    it('calls get on the documents store with the projectId', async () => {
      mockDb.get.mockResolvedValueOnce(undefined);
      await loadDocument('my-project');
      expect(mockDb.get).toHaveBeenCalledWith('documents', 'my-project');
    });
  });

  describe('listPendingSync', () => {
    it('returns a Promise', () => {
      const result = listPendingSync();
      expect(result).toBeInstanceOf(Promise);
    });

    it('returns empty array when no pending items', async () => {
      mockDb.getAll.mockResolvedValueOnce([]);
      const result = await listPendingSync();
      expect(result).toEqual([]);
    });

    it('returns only projects with pendingSync=true', async () => {
      mockDb.getAll.mockResolvedValueOnce([
        { projectId: 'proj-a', data: '{}', pendingSync: true, savedAt: 1000 },
        { projectId: 'proj-b', data: '{}', pendingSync: false, savedAt: 2000 },
        { projectId: 'proj-c', data: '{}', pendingSync: true, savedAt: 3000 },
      ]);
      const result = await listPendingSync();
      expect(result).toEqual(['proj-a', 'proj-c']);
    });

    it('returns project IDs as strings', async () => {
      mockDb.getAll.mockResolvedValueOnce([
        { projectId: 'proj-x', data: '{}', pendingSync: true, savedAt: 1000 },
      ]);
      const result = await listPendingSync();
      expect(result).toEqual(['proj-x']);
    });
  });

  describe('markSynced', () => {
    it('returns a Promise', () => {
      const result = markSynced('proj-1');
      expect(result).toBeInstanceOf(Promise);
    });

    it('updates pendingSync to false for the project', async () => {
      const record = { projectId: 'proj-6', data: '{}', pendingSync: true, savedAt: 1000 };
      mockDb.get.mockResolvedValueOnce(record);
      await markSynced('proj-6');
      expect(mockDb.put).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          projectId: 'proj-6',
          pendingSync: false,
        })
      );
    });

    it('resolves without throwing when project not found', async () => {
      mockDb.get.mockResolvedValueOnce(undefined);
      await expect(markSynced('nonexistent')).resolves.not.toThrow();
    });

    it('removes project from pending list after markSynced', async () => {
      // Simulate a document that was pending
      const record = { projectId: 'proj-7', data: '{}', pendingSync: true, savedAt: 1000 };
      mockDb.get.mockResolvedValueOnce(record);

      await markSynced('proj-7');

      // Now simulate getAll returning the updated record (pendingSync=false)
      mockDb.getAll.mockResolvedValueOnce([
        { projectId: 'proj-7', data: '{}', pendingSync: false, savedAt: 1000 },
      ]);
      const pending = await listPendingSync();
      expect(pending).not.toContain('proj-7');
    });
  });
});
