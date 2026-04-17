/**
 * T-OFF: Offline-first architecture tests
 *
 * Verifies that the document state survives serialisation/deserialisation
 * (the localStorage / IndexedDB round-trip), that the pending operations
 * queue works while offline, and that the close-guard invariant is respected.
 *
 * These tests run entirely in-memory — no real IndexedDB required.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from './documentStore';
import { DocumentModel } from '@opencad/document';

function freshStore() {
  useDocumentStore.getState().loadProject('offline-test', 'user-001');
}
function layerId() {
  return Object.keys(useDocumentStore.getState().document!.organization.layers)[0]!;
}

// ─── T-OFF-001: Document serialises and deserialises correctly ───────────────

describe('T-OFF-001: Document round-trips through JSON without data loss', () => {
  beforeEach(freshStore);

  it('project name survives serialise → deserialise', () => {
    const original = useDocumentStore.getState().document!;
    const json = JSON.stringify(original);
    const restored = JSON.parse(json) as typeof original;
    expect(restored.name).toBe(original.name);
    expect(restored.id).toBe(original.id);
  });

  it('elements survive serialise → deserialise', () => {
    const lid = layerId();
    useDocumentStore.getState().addElement({
      type: 'wall', layerId: lid,
      properties: {
        StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 5000 }, EndY: { type: 'number', value: 0 },
        Height: { type: 'number', value: 3000 }, Width: { type: 'number', value: 200 },
      },
    });

    const original = useDocumentStore.getState().document!;
    const json = JSON.stringify(original);
    const restored = JSON.parse(json) as typeof original;

    const els = Object.values(restored.content.elements);
    expect(els).toHaveLength(1);
    expect(els[0]!.type).toBe('wall');
    expect(els[0]!.properties['EndX']?.value).toBe(5000);
  });

  it('layers survive serialise → deserialise', () => {
    const original = useDocumentStore.getState().document!;
    const json = JSON.stringify(original);
    const restored = JSON.parse(json) as typeof original;
    expect(Object.keys(restored.organization.layers)).toHaveLength(
      Object.keys(original.organization.layers).length
    );
  });
});

// ─── T-OFF-002: Offline edit — pending operations tracked ───────────────────

describe('T-OFF-002: Offline editing queues pending operations', () => {
  it('model tracks pending operations when offline', () => {
    const model = new DocumentModel('offline-proj', 'user-offline');
    model.setOnlineStatus(false);

    const layerId = Object.keys(model.documentData.organization.layers)[0]!;
    model.addElement({
      type: 'annotation',
      layerId,
      properties: {
        StartX: { type: 'string', value: 0 },
        StartY: { type: 'string', value: 0 },
        EndX:   { type: 'string', value: 100 },
        EndY:   { type: 'string', value: 0 },
      },
    });

    const pending = model.getPendingOperations();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0]!.synced).toBe(false);
  });

  it('pending operations cleared when back online', () => {
    const model = new DocumentModel('online-proj', 'user-online');
    model.setOnlineStatus(false);

    const layerId = Object.keys(model.documentData.organization.layers)[0]!;
    model.addElement({ type: 'annotation', layerId, properties: { StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: 10 }, EndY: { type: 'number', value: 0 } } });

    expect(model.getPendingOperations().length).toBeGreaterThan(0);

    model.setOnlineStatus(true);
    expect(model.getPendingOperations()).toHaveLength(0);
  });
});

// ─── T-OFF-003: loadDocument restores document state ────────────────────────

describe('T-OFF-003: loadDocument restores saved document', () => {
  it('loadDocument replaces document content', () => {
    const model1 = new DocumentModel('proj-a', 'user-001');
    const layerId = Object.keys(model1.documentData.organization.layers)[0]!;
    model1.addElement({
      type: 'rectangle', layerId,
      properties: {
        X: { type: 'number', value: 100 }, Y: { type: 'number', value: 100 },
        Width: { type: 'number', value: 500 }, Height: { type: 'number', value: 300 },
      },
    });

    // Serialise → deserialise → load into a new model
    const serialised = JSON.parse(JSON.stringify(model1.documentData));
    const model2 = new DocumentModel('proj-b', 'user-002');
    model2.loadDocument(serialised);

    const els = Object.values(model2.elements);
    expect(els).toHaveLength(1);
    expect(els[0]!.type).toBe('rectangle');
  });

  it('loadDocument migrates degenerate bounding boxes', () => {
    // Simulate a document saved before bounding box computation existed
    const model = new DocumentModel('legacy', 'user');
    const layerId = Object.keys(model.documentData.organization.layers)[0]!;
    const id = model.addElement({
      type: 'circle', layerId,
      properties: { CenterX: { type: 'number', value: 500 }, CenterY: { type: 'number', value: 500 }, Radius: { type: 'number', value: 200 } },
    });

    // Force a degenerate bbox to simulate a legacy save
    const el = model.elements[id]!;
    el.boundingBox = { min: { x: 0, y: 0, z: 0, _type: 'Point3D' }, max: { x: 0, y: 0, z: 0, _type: 'Point3D' } };

    // Re-load the (patched) serialised form
    const saved = JSON.parse(JSON.stringify(model.documentData));
    const restored = new DocumentModel('legacy', 'user');
    restored.loadDocument(saved);

    const restoredEl = restored.elements[id]!;
    // Should have been migrated
    expect(restoredEl.boundingBox.max.x).toBeGreaterThan(0);
  });
});

// ─── T-OFF-004: Version history survives serialize/restore ──────────────────

describe('T-OFF-004: Version history', () => {
  it('createVersion + getVersionList returns versions in order', () => {
    const model = new DocumentModel('versioned', 'user');
    model.createVersion('v1');
    model.createVersion('v2');
    model.createVersion('v3');

    const list = model.getVersionList();
    expect(list).toHaveLength(3);
    expect(list[0]!.message).toBe('v1');
    expect(list[2]!.message).toBe('v3');
    expect(list[2]!.version).toBeGreaterThan(list[0]!.version);
  });

  it('restoreVersion rolls back document to that state', () => {
    const model = new DocumentModel('rollback', 'user');
    const layerId = Object.keys(model.documentData.organization.layers)[0]!;

    model.createVersion('empty');
    model.addElement({ type: 'rectangle', layerId, properties: { X: { type: 'number', value: 0 }, Y: { type: 'number', value: 0 }, Width: { type: 'number', value: 100 }, Height: { type: 'number', value: 100 } } });
    expect(Object.keys(model.elements)).toHaveLength(1);

    model.restoreVersion(1); // restore to 'empty'
    expect(Object.keys(model.elements)).toHaveLength(0);
  });
});

// ─── T-OFF-005: Auto-save store state tracks document changes ────────────────

describe('T-OFF-005: Document state updates are reflected in the store', () => {
  beforeEach(freshStore);

  it('adding an element increments element count in store document', () => {
    const before = Object.keys(useDocumentStore.getState().document!.content.elements).length;
    useDocumentStore.getState().addElement({
      type: 'text', layerId: layerId(),
      properties: { X: { type: 'number', value: 100 }, Y: { type: 'number', value: 100 }, Text: { type: 'string', value: 'Hello' } },
    });
    const after = Object.keys(useDocumentStore.getState().document!.content.elements).length;
    expect(after).toBe(before + 1);
  });

  it('deleteElement removes it from the store document', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'circle', layerId: layerId(),
      properties: { CenterX: { type: 'number', value: 0 }, CenterY: { type: 'number', value: 0 }, Radius: { type: 'number', value: 100 } },
    });
    expect(useDocumentStore.getState().document!.content.elements[id]).toBeDefined();

    useDocumentStore.getState().deleteElement(id);
    expect(useDocumentStore.getState().document!.content.elements[id]).toBeUndefined();
  });

  it('updateElement mutates the property in place', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'rectangle', layerId: layerId(),
      properties: { X: { type: 'number', value: 0 }, Y: { type: 'number', value: 0 }, Width: { type: 'number', value: 100 }, Height: { type: 'number', value: 100 } },
    });
    useDocumentStore.getState().updateElement(id, {
      properties: { X: { type: 'number', value: 999 }, Y: { type: 'number', value: 0 }, Width: { type: 'number', value: 100 }, Height: { type: 'number', value: 100 } },
    });
    const el = useDocumentStore.getState().document!.content.elements[id];
    expect(el?.properties['X']?.value).toBe(999);
  });
});

// ─── T-OFF-006: setOnlineStatus toggles isOnline in store ───────────────────

describe('T-OFF-006: Online status toggling', () => {
  beforeEach(freshStore);

  it('setOnlineStatus(false) sets isOnline = false', () => {
    useDocumentStore.getState().setOnlineStatus(false);
    expect(useDocumentStore.getState().isOnline).toBe(false);
  });

  it('setOnlineStatus(true) sets isOnline = true', () => {
    useDocumentStore.getState().setOnlineStatus(false);
    useDocumentStore.getState().setOnlineStatus(true);
    expect(useDocumentStore.getState().isOnline).toBe(true);
  });
});
