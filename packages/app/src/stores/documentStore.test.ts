import { describe, it, expect, beforeEach } from 'vitest';
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

describe('T-DOC-007: Undo history is capped at MAX_HISTORY (50)', () => {
  beforeEach(() => {
    useDocumentStore.getState().loadProject('test-project', 'user-001');
  });

  it('pushHistory 60 times → history.length capped at 50', () => {
    const store = useDocumentStore.getState();
    for (let i = 0; i < 60; i++) {
      store.pushHistory(`step ${i}`);
    }
    expect(useDocumentStore.getState().history.length).toBe(50);
  });

  it('pushHistory 100 times → history.length capped at 50', () => {
    const store = useDocumentStore.getState();
    for (let i = 0; i < 100; i++) {
      store.pushHistory(`step ${i}`);
    }
    expect(useDocumentStore.getState().history.length).toBe(50);
  });

  it('pushHistory 51 times → history.length capped at 50', () => {
    const store = useDocumentStore.getState();
    for (let i = 0; i < 51; i++) {
      store.pushHistory(`step ${i}`);
    }
    expect(useDocumentStore.getState().history.length).toBe(50);
  });
});

describe('T-BIM-006: Level operations', () => {
  beforeEach(() => {
    useDocumentStore.getState().loadProject('test-project', 'user-001');
  });

  it('addLevel adds a new level and returns an id', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'Level 2', elevation: 3000 });
    expect(typeof levelId).toBe('string');
    expect(levelId.length).toBeGreaterThan(0);
    const doc = useDocumentStore.getState().document;
    expect(doc?.organization.levels[levelId]).toBeDefined();
  });

  it('addLevel sets selectedLevelId to the new level id', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'Level 3', elevation: 6000 });
    expect(useDocumentStore.getState().selectedLevelId).toBe(levelId);
  });

  it('deleteLevel removes a level when more than 1 exist', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'Temp Level', elevation: 1000 });
    const docBefore = useDocumentStore.getState().document;
    const countBefore = Object.keys(docBefore?.organization.levels ?? {}).length;
    expect(countBefore).toBeGreaterThan(1);

    useDocumentStore.getState().deleteLevel(levelId);
    const docAfter = useDocumentStore.getState().document;
    expect(docAfter?.organization.levels[levelId]).toBeUndefined();
  });

  it('deleteLevel throws when asked to remove the last remaining level', () => {
    // loadProject creates exactly 1 level; trying to delete it should now
    // throw (audit 2026-04-19: deleteLevel contract aligned with deleteLayer).
    const doc = useDocumentStore.getState().document;
    const levelIds = Object.keys(doc?.organization.levels ?? {});
    expect(levelIds.length).toBe(1);

    expect(() => useDocumentStore.getState().deleteLevel(levelIds[0]!))
      .toThrow(/last level/);
    const docAfter = useDocumentStore.getState().document;
    expect(Object.keys(docAfter?.organization.levels ?? {}).length).toBe(1);
  });

  it('renameLevel changes the level name', () => {
    const doc = useDocumentStore.getState().document;
    const levelId = Object.keys(doc?.organization.levels ?? {})[0]!;

    useDocumentStore.getState().renameLevel(levelId, 'Ground Floor');
    const docAfter = useDocumentStore.getState().document;
    expect(docAfter?.organization.levels[levelId]?.name).toBe('Ground Floor');
  });

  it('setActiveLevel sets selectedLevelId', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'Roof', elevation: 9000 });
    useDocumentStore.getState().setActiveLevel(levelId);
    expect(useDocumentStore.getState().selectedLevelId).toBe(levelId);
  });
});
