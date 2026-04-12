import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let localStorageData: Record<string, string> = {};
let fetchMock: ReturnType<typeof vi.fn>;

const mockLocalStorage = {
  getItem: (key: string) => localStorageData[key] || null,
  setItem: (key: string, value: string) => {
    localStorageData[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageData[key];
  },
  clear: () => {
    localStorageData = {};
  },
  get length() {
    return Object.keys(localStorageData).length;
  },
  key: (i: number) => Object.keys(localStorageData)[i] || null,
};

describe('T-OFF: Offline-First Tests', () => {
  beforeEach(() => {
    localStorageData = {};
    fetchMock = vi.fn();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      writable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('T-OFF-001: should check storage quota', async () => {
    const { getStorageQuota } = await import('./offline');
    const quota = await getStorageQuota();
    expect(quota).toHaveProperty('used');
  });

  it('T-OFF-002: should save and load offline document', async () => {
    const { saveDocumentOffline, loadDocumentOffline } = await import('./offline');
    const doc = { id: 'test' };
    await saveDocumentOffline('doc1', doc);
    const loaded = await loadDocumentOffline('doc1');
    expect(loaded).toEqual(doc);
  });

  it('T-OFF-003: should handle pending operations', async () => {
    const { addPendingOperation, getPendingOperations, clearPendingOperations } =
      await import('./offline');
    await clearPendingOperations();
    await addPendingOperation({
      id: 'op1',
      type: 'create',
      entityType: 'el',
      entityId: 'e1',
      data: {},
      timestamp: 1,
      clientId: 'c1',
    });
    const ops = await getPendingOperations();
    expect(ops.length).toBe(1);
  });

  it('T-OFF-004: should check sync status', async () => {
    const { getSyncStatus } = await import('./offline');
    const status = await getSyncStatus();
    expect(['synced', 'pending', 'offline', 'error']).toContain(status);
  });

  it('T-OFF-005: should warn on storage quota', async () => {
    const { checkStorageQuotaWarning } = await import('./offline');
    const warning = await checkStorageQuotaWarning();
    expect(typeof warning).toBe('boolean');
  });

  it('T-OFF-006: should run offline code compliance', async () => {
    const { runOfflineCodeCompliance } = await import('./offline');
    const result = await runOfflineCodeCompliance({}, ['check-walls-have-height']);
    expect(result).toHaveProperty('success');
  });

  it('T-OFF-007: should check for app update', async () => {
    const { checkForAppUpdate } = await import('./offline');
    const update = await checkForAppUpdate();
    expect(update).toHaveProperty('available');
  });
});
