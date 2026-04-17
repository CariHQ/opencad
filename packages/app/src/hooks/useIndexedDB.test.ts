/**
 * useIndexedDB hook tests
 * T-OFF-003: IndexedDB storage layer for browser-native persistence
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIndexedDB } from './useIndexedDB';

const mocks = vi.hoisted(() => ({
  initStorage: vi.fn().mockResolvedValue(undefined),
  saveProject: vi.fn().mockResolvedValue(undefined),
  loadProject: vi.fn().mockResolvedValue(null),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock('@opencad/document', async (importOriginal) => {
  const real = await importOriginal<typeof import('@opencad/document')>();
  return {
    ...real,
    initStorage: mocks.initStorage,
    saveProject: mocks.saveProject,
    loadProject: mocks.loadProject,
    deleteProject: mocks.deleteProject,
    listProjects: mocks.listProjects,
  };
});

describe('T-OFF-003: useIndexedDB', () => {
  beforeEach(() => {
    mocks.initStorage.mockResolvedValue(undefined);
    mocks.saveProject.mockResolvedValue(undefined);
    mocks.loadProject.mockResolvedValue(null);
    mocks.deleteProject.mockResolvedValue(undefined);
    mocks.listProjects.mockResolvedValue([]);
  });

  it('begins in idle or initializing state', () => {
    const { result } = renderHook(() => useIndexedDB());
    expect(['idle', 'initializing']).toContain(result.current.status);
  });

  it('transitions to ready after init', async () => {
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('transitions to error when init fails', async () => {
    mocks.initStorage.mockRejectedValueOnce(new Error('IDB unavailable'));
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('sets error message on init failure', async () => {
    mocks.initStorage.mockRejectedValueOnce(new Error('IDB unavailable'));
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.error).toBe('IDB unavailable'));
  });

  it('error is null on successful init', async () => {
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.error).toBeNull();
  });

  it('save() calls saveProject with the document', async () => {
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const doc = { id: 'doc-1', name: 'Test' } as Parameters<typeof result.current.save>[0];
    await result.current.save(doc);
    expect(mocks.saveProject).toHaveBeenCalledWith(doc);
  });

  it('load() returns null when document not found', async () => {
    mocks.loadProject.mockResolvedValue(undefined);
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const loaded = await result.current.load('non-existent');
    expect(loaded).toBeNull();
  });

  it('load() returns document when found', async () => {
    const doc = { id: 'doc-1', name: 'Found' };
    mocks.loadProject.mockResolvedValue(doc);
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const loaded = await result.current.load('doc-1');
    expect(loaded).toEqual(doc);
  });

  it('remove() calls deleteProject with the id', async () => {
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await result.current.remove('proj-1');
    expect(mocks.deleteProject).toHaveBeenCalledWith('proj-1');
  });

  it('list() returns mapped projects', async () => {
    mocks.listProjects.mockResolvedValue([
      { id: 'p1', name: 'Project 1', savedAt: 1000 },
      { id: 'p2', name: 'Project 2', savedAt: 2000 },
    ]);
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const list = await result.current.list();
    expect(list).toEqual([
      { id: 'p1', name: 'Project 1', updatedAt: 1000 },
      { id: 'p2', name: 'Project 2', updatedAt: 2000 },
    ]);
  });

  it('list() returns empty array when no projects', async () => {
    mocks.listProjects.mockResolvedValue([]);
    const { result } = renderHook(() => useIndexedDB());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const list = await result.current.list();
    expect(list).toEqual([]);
  });
});
