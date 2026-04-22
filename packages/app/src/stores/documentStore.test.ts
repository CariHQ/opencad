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

// ───────────────────────────────────────────────────────────────────────────
// T-DOC-021: Every mutating action persists to localStorage so refreshing
// the tab recovers the last edit. The prior bug was that only addElement
// wrote to storage — updateElement, deleteElement, layer/level/pset/rename
// mutations, material changes, and undo/redo all updated Zustand state in
// memory but never touched the per-project docKey, so a refresh rolled the
// document back to the last addElement.
// ───────────────────────────────────────────────────────────────────────────

describe('T-DOC-021: Mutating actions persist to localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    useDocumentStore.getState().initProject('persist-proj', 'user-001');
  });

  function readPersisted(): { organization?: { layers?: Record<string, unknown>; levels?: Record<string, unknown> }; content?: { elements?: Record<string, { properties?: Record<string, { value: unknown }> }> }; name?: string; presentation?: { views?: Record<string, unknown> } } | null {
    const raw = localStorage.getItem('opencad-document:persist-proj');
    return raw ? JSON.parse(raw) : null;
  }

  it('addElement persists', () => {
    const layerId = useDocumentStore.getState().addLayer({ name: 'L', color: '#fff' });
    const elId = useDocumentStore.getState().addElement({
      type: 'wall', layerId, properties: { Height: { type: 'number', value: 3000 } },
    });
    const persisted = readPersisted();
    expect(persisted?.content?.elements?.[elId]).toBeDefined();
  });

  it('updateElement persists the edit (regression for save loss)', () => {
    const layerId = useDocumentStore.getState().addLayer({ name: 'L', color: '#fff' });
    const elId = useDocumentStore.getState().addElement({
      type: 'wall', layerId, properties: { Height: { type: 'number', value: 3000 } },
    });
    useDocumentStore.getState().updateElement(elId, {
      properties: { Height: { type: 'number', value: 4200 } },
    });
    const persisted = readPersisted();
    expect(persisted?.content?.elements?.[elId]?.properties?.Height?.value).toBe(4200);
  });

  it('deleteElement persists the deletion', () => {
    const layerId = useDocumentStore.getState().addLayer({ name: 'L', color: '#fff' });
    const elId = useDocumentStore.getState().addElement({ type: 'wall', layerId });
    useDocumentStore.getState().deleteElement(elId);
    const persisted = readPersisted();
    expect(persisted?.content?.elements?.[elId]).toBeUndefined();
  });

  it('addLayer persists', () => {
    const layerId = useDocumentStore.getState().addLayer({ name: 'MEP', color: '#0ff' });
    const persisted = readPersisted();
    expect(persisted?.organization?.layers?.[layerId]).toBeDefined();
  });

  it('addLevel persists', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'Roof', elevation: 9000 });
    const persisted = readPersisted();
    expect(persisted?.organization?.levels?.[levelId]).toBeDefined();
  });

  it('renameLevel persists the new name', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'L2', elevation: 3000 });
    useDocumentStore.getState().renameLevel(levelId, 'First Floor');
    const persisted = readPersisted();
    // Level schema lives under organization.levels[id].name.
    const levels = persisted?.organization?.levels as Record<string, { name: string }> | undefined;
    expect(levels?.[levelId]?.name).toBe('First Floor');
  });

  it('renameProject persists the new project name', () => {
    useDocumentStore.getState().renameProject('My Renamed Project');
    expect(readPersisted()?.name).toBe('My Renamed Project');
  });

  it('setElementMaterial persists the material assignment', () => {
    const layerId = useDocumentStore.getState().addLayer({ name: 'L', color: '#fff' });
    const elId = useDocumentStore.getState().addElement({ type: 'wall', layerId });
    useDocumentStore.getState().setElementMaterial(elId, 'concrete');
    const mat = readPersisted()?.content?.elements?.[elId]?.properties?.Material?.value;
    expect(mat).toBe('concrete');
  });

  it('addRendering persists the render view', () => {
    const id = useDocumentStore.getState().addRendering({
      name: 'Test render', png: 'data:image/png;base64,AAAA', width: 1920, height: 1080, samples: 16,
    });
    expect(id).toBeTruthy();
    const views = readPersisted()?.presentation?.views as Record<string, { type: string }> | undefined;
    expect(views?.[id!]?.type).toBe('render');
  });
});
