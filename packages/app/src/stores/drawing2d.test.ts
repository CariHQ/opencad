/**
 * T-2D: 2D Drafting Tools
 *
 * Verifies that drawing tools store the correct geometry in the document model,
 * that snapping tolerances hold, that layers can hide elements, and that
 * undo/redo maintains state consistency.
 *
 * These tests exercise the document store (addElement, updateElement,
 * deleteElement, pushHistory, undo, redo) directly — they do NOT require
 * a rendered canvas or React component.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from './documentStore';

// ─── helpers ────────────────────────────────────────────────────────────────

function prop(el: ReturnType<typeof useDocumentStore.getState>['document'] extends null ? never : NonNullable<ReturnType<typeof useDocumentStore.getState>['document']>['content']['elements'][string], key: string): unknown {
  return el?.properties?.[key]?.value;
}

function freshStore() {
  useDocumentStore.getState().loadProject('2d-test', 'user-001');
  return useDocumentStore.getState();
}

function defaultLayerId() {
  const doc = useDocumentStore.getState().document!;
  return Object.keys(doc.organization.layers)[0]!;
}

// ─── T-2D-001: Line tool stores correct coordinates ─────────────────────────

describe('T-2D-001: Line tool stores correct coordinates', () => {
  beforeEach(() => { freshStore(); });

  it('addElement(annotation) stores StartX/Y, EndX/Y matching draw coordinates', () => {
    const layerId = defaultLayerId();
    const id = useDocumentStore.getState().addElement({
      type: 'annotation',
      layerId,
      properties: {
        Name:   { type: 'string', value: 'Line' },
        StartX: { type: 'number', value: 100 },
        StartY: { type: 'number', value: 200 },
        EndX:   { type: 'number', value: 500 },
        EndY:   { type: 'number', value: 600 },
      },
    });

    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(prop(el, 'StartX')).toBe(100);
    expect(prop(el, 'StartY')).toBe(200);
    expect(prop(el, 'EndX')).toBe(500);
    expect(prop(el, 'EndY')).toBe(600);
    expect(el.type).toBe('annotation');
  });

  it('addElement assigns a non-empty UUID', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'annotation',
      layerId: defaultLayerId(),
      properties: { StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: 100 }, EndY: { type: 'number', value: 100 } },
    });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('multiple lines are stored independently', () => {
    const layerId = defaultLayerId();
    const id1 = useDocumentStore.getState().addElement({ type: 'annotation', layerId, properties: { StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: 10 }, EndY: { type: 'number', value: 0 } } });
    const id2 = useDocumentStore.getState().addElement({ type: 'annotation', layerId, properties: { StartX: { type: 'number', value: 20 }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: 30 }, EndY: { type: 'number', value: 0 } } });
    expect(id1).not.toBe(id2);
    const els = useDocumentStore.getState().document!.content.elements;
    expect(prop(els[id1]!, 'StartX')).toBe(0);
    expect(prop(els[id2]!, 'StartX')).toBe(20);
  });
});

// ─── T-2D-002: Snap tolerance — elements store exact input coordinates ───────

describe('T-2D-002: Snap tolerance — input coordinates are stored exactly', () => {
  beforeEach(() => { freshStore(); });

  it('fractional coordinates are preserved (no rounding by store)', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'circle',
      layerId: defaultLayerId(),
      properties: {
        CenterX: { type: 'number', value: 123.456 },
        CenterY: { type: 'number', value: 789.012 },
        Radius:  { type: 'number', value: 50.5 },
      },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(prop(el, 'CenterX')).toBeCloseTo(123.456, 3);
    expect(prop(el, 'Radius')).toBeCloseTo(50.5, 3);
  });

  it('negative coordinates are stored correctly (quadrant 3)', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'annotation',
      layerId: defaultLayerId(),
      properties: {
        StartX: { type: 'number', value: -500 },
        StartY: { type: 'number', value: -300 },
        EndX:   { type: 'number', value: -100 },
        EndY:   { type: 'number', value: -50 },
      },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(prop(el, 'StartX')).toBe(-500);
    expect(prop(el, 'EndY')).toBe(-50);
  });
});

// ─── T-2D-003: Dimension tool stores start/end correctly ────────────────────

describe('T-2D-003: Dimension tool stores start and end coordinates', () => {
  beforeEach(() => { freshStore(); });

  it('dimension element stores StartX/Y and EndX/Y', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'dimension',
      layerId: defaultLayerId(),
      properties: {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX:   { type: 'number', value: 3000 },
        EndY:   { type: 'number', value: 0 },
        Label:  { type: 'string', value: '3000' },
      },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(el.type).toBe('dimension');
    expect(prop(el, 'EndX')).toBe(3000);
  });

  it('dimension bounding box spans start to end', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'dimension',
      layerId: defaultLayerId(),
      properties: {
        StartX: { type: 'number', value: 100 },
        StartY: { type: 'number', value: 100 },
        EndX:   { type: 'number', value: 1100 },
        EndY:   { type: 'number', value: 100 },
      },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(el.boundingBox.min.x).toBe(100);
    expect(el.boundingBox.max.x).toBe(1100);
  });
});

// ─── T-2D-004: Layer visibility — elements belong to their layer ─────────────

describe('T-2D-004: Layer visibility — elements are assigned to the correct layer', () => {
  beforeEach(() => { freshStore(); });

  it('element is stored under the specified layerId', () => {
    const doc = useDocumentStore.getState().document!;
    const layerId = Object.keys(doc.organization.layers)[0]!;

    const id = useDocumentStore.getState().addElement({
      type: 'rectangle',
      layerId,
      properties: {
        X: { type: 'number', value: 0 }, Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 500 }, Height: { type: 'number', value: 300 },
      },
    });

    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(el.layerId).toBe(layerId);
  });

  it('addLayer → addElement with new layerId → element is on new layer', () => {
    const newLayerId = useDocumentStore.getState().addLayer({ name: 'Annotations', color: '#ff0000' });
    const id = useDocumentStore.getState().addElement({
      type: 'text',
      layerId: newLayerId,
      properties: { X: { type: 'number', value: 50 }, Y: { type: 'number', value: 50 }, Text: { type: 'string', value: 'Note' } },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(el.layerId).toBe(newLayerId);
  });

  it('layer is flagged as visible by default', () => {
    const doc = useDocumentStore.getState().document!;
    const layer = Object.values(doc.organization.layers)[0]!;
    expect(layer.visible).toBe(true);
  });

  it('updateLayer can hide a layer', () => {
    const doc = useDocumentStore.getState().document!;
    const layerId = Object.keys(doc.organization.layers)[0]!;
    useDocumentStore.getState().updateLayer(layerId, { visible: false });
    const updated = useDocumentStore.getState().document!.organization.layers[layerId]!;
    expect(updated.visible).toBe(false);
  });
});

// ─── T-2D-005: Undo/redo maintains state consistency ────────────────────────

describe('T-2D-005: Undo/redo state consistency', () => {
  beforeEach(() => { freshStore(); });

  it('undo after 2 pushes returns to initial element count', () => {
    const layerId = defaultLayerId();
    // Push initial empty state first, then add + push
    useDocumentStore.getState().pushHistory('initial');
    const before = Object.keys(useDocumentStore.getState().document!.content.elements).length;

    useDocumentStore.getState().addElement({ type: 'annotation', layerId, properties: { StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: 100 }, EndY: { type: 'number', value: 0 } } });
    useDocumentStore.getState().pushHistory('Add line');

    // One element added
    expect(Object.keys(useDocumentStore.getState().document!.content.elements).length).toBe(before + 1);

    // Undo restores to the initial snapshot
    useDocumentStore.getState().undo();
    expect(Object.keys(useDocumentStore.getState().document!.content.elements).length).toBe(before);
  });

  it('redo after undo restores the added element', () => {
    const layerId = defaultLayerId();
    // Push initial state before mutation, then add + push
    useDocumentStore.getState().pushHistory('initial');
    const before = Object.keys(useDocumentStore.getState().document!.content.elements).length;

    useDocumentStore.getState().addElement({ type: 'rectangle', layerId, properties: { X: { type: 'number', value: 0 }, Y: { type: 'number', value: 0 }, Width: { type: 'number', value: 200 }, Height: { type: 'number', value: 100 } } });
    useDocumentStore.getState().pushHistory('Add rectangle');

    useDocumentStore.getState().undo();
    expect(Object.keys(useDocumentStore.getState().document!.content.elements).length).toBe(before);

    useDocumentStore.getState().redo();
    expect(Object.keys(useDocumentStore.getState().document!.content.elements).length).toBe(before + 1);
  });

  it('20 actions → undo 10 → redo 5 → correct historyIndex', () => {
    const layerId = defaultLayerId();
    for (let i = 0; i < 20; i++) {
      useDocumentStore.getState().addElement({ type: 'annotation', layerId, properties: { StartX: { type: 'number', value: i }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: i + 1 }, EndY: { type: 'number', value: 0 } } });
      useDocumentStore.getState().pushHistory(`step ${i}`);
    }
    for (let i = 0; i < 10; i++) useDocumentStore.getState().undo();
    for (let i = 0; i < 5; i++) useDocumentStore.getState().redo();

    const { canUndo, canRedo } = useDocumentStore.getState();
    expect(canUndo).toBe(true);
    expect(canRedo).toBe(true);
  });

  it('canUndo is false before any history push', () => {
    expect(useDocumentStore.getState().canUndo).toBe(false);
  });

  it('canRedo is false when at the latest history entry', () => {
    const layerId = defaultLayerId();
    useDocumentStore.getState().addElement({ type: 'circle', layerId, properties: { CenterX: { type: 'number', value: 0 }, CenterY: { type: 'number', value: 0 }, Radius: { type: 'number', value: 100 } } });
    useDocumentStore.getState().pushHistory('Add circle');
    expect(useDocumentStore.getState().canRedo).toBe(false);
  });
});

// ─── T-2D-006: Polygon and polyline store point arrays ──────────────────────

describe('T-2D-006: Polygon and polyline store points array', () => {
  beforeEach(() => { freshStore(); });

  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

  it('polygon element stores JSON-encoded Points property', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'polygon',
      layerId: defaultLayerId(),
      properties: { Points: { type: 'string', value: JSON.stringify(points) } },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    const parsed = JSON.parse(prop(el, 'Points') as string) as { x: number; y: number }[];
    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toMatchObject({ x: 0, y: 0 });
    expect(parsed[3]).toMatchObject({ x: 0, y: 100 });
  });

  it('polygon bounding box is derived from min/max of points', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'polygon',
      layerId: defaultLayerId(),
      properties: { Points: { type: 'string', value: JSON.stringify(points) } },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(el.boundingBox.min.x).toBe(0);
    expect(el.boundingBox.max.x).toBe(100);
    expect(el.boundingBox.max.y).toBe(100);
  });
});

// ─── T-2D-007: Circle and arc store center + radius ─────────────────────────

describe('T-2D-007: Circle and arc geometry', () => {
  beforeEach(() => { freshStore(); });

  it('circle stores CenterX, CenterY, Radius', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'circle',
      layerId: defaultLayerId(),
      properties: { CenterX: { type: 'number', value: 250 }, CenterY: { type: 'number', value: 250 }, Radius: { type: 'number', value: 100 } },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(prop(el, 'CenterX')).toBe(250);
    expect(prop(el, 'Radius')).toBe(100);
  });

  it('circle bounding box = [cx-r, cy-r] → [cx+r, cy+r]', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'circle',
      layerId: defaultLayerId(),
      properties: { CenterX: { type: 'number', value: 500 }, CenterY: { type: 'number', value: 500 }, Radius: { type: 'number', value: 200 } },
    });
    const bb = useDocumentStore.getState().document!.content.elements[id]!.boundingBox;
    expect(bb.min.x).toBe(300);
    expect(bb.max.x).toBe(700);
    expect(bb.min.y).toBe(300);
    expect(bb.max.y).toBe(700);
  });

  it('arc stores StartAngle and EndAngle', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'arc',
      layerId: defaultLayerId(),
      properties: {
        CenterX:    { type: 'number', value: 0 },
        CenterY:    { type: 'number', value: 0 },
        Radius:     { type: 'number', value: 150 },
        StartAngle: { type: 'number', value: 0 },
        EndAngle:   { type: 'number', value: Math.PI },
      },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(prop(el, 'StartAngle')).toBeCloseTo(0);
    expect(prop(el, 'EndAngle')).toBeCloseTo(Math.PI, 5);
  });
});

// ─── T-2D-008: Rectangle stores X, Y, Width, Height ────────────────────────

describe('T-2D-008: Rectangle geometry', () => {
  beforeEach(() => { freshStore(); });

  it('rectangle stores X, Y, Width, Height', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'rectangle',
      layerId: defaultLayerId(),
      properties: {
        X: { type: 'number', value: 100 }, Y: { type: 'number', value: 200 },
        Width: { type: 'number', value: 800 }, Height: { type: 'number', value: 600 },
      },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(prop(el, 'Width')).toBe(800);
    expect(prop(el, 'Height')).toBe(600);
  });

  it('rectangle bounding box = [X, Y] → [X+W, Y+H]', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'rectangle',
      layerId: defaultLayerId(),
      properties: { X: { type: 'number', value: 50 }, Y: { type: 'number', value: 50 }, Width: { type: 'number', value: 400 }, Height: { type: 'number', value: 300 } },
    });
    const bb = useDocumentStore.getState().document!.content.elements[id]!.boundingBox;
    expect(bb.min.x).toBe(50);
    expect(bb.max.x).toBe(450);
    expect(bb.min.y).toBe(50);
    expect(bb.max.y).toBe(350);
  });
});
