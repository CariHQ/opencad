import { describe, it, expect } from 'vitest';
import { useDocumentStore } from './documentStore';

describe('Document Store', () => {
  it('should initialize with default state', () => {
    const state = useDocumentStore.getState();

    expect(state.document).toBeDefined();
    expect(state.selectedIds).toEqual([]);
    expect(state.activeTool).toBe('select');
  });

  it('should set selected IDs', () => {
    useDocumentStore.getState().setSelectedIds(['test-id']);

    expect(useDocumentStore.getState().selectedIds).toEqual(['test-id']);
  });

  it('should set active tool', () => {
    useDocumentStore.getState().setActiveTool('wall');

    expect(useDocumentStore.getState().activeTool).toBe('wall');
  });
});
