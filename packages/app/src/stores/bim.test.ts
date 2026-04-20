/**
 * T-BIM: Building Information Modeling element tests
 *
 * Verifies BIM elements (wall, door, window, slab, column, beam, stair)
 * are stored with correct properties and IFC-relevant fields.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from './documentStore';

function freshStore() {
  useDocumentStore.getState().loadProject('bim-test', 'user-001');
}
function layerId() {
  return Object.keys(useDocumentStore.getState().document!.organization.layers)[0]!;
}
function prop(elementId: string, key: string): unknown {
  return useDocumentStore.getState().document!.content.elements[elementId]?.properties[key]?.value;
}

// ─── T-BIM-001: Wall tool ────────────────────────────────────────────────────

describe('T-BIM-001: Wall element', () => {
  beforeEach(freshStore);

  it('wall stores StartX, StartY, EndX, EndY, Height, Width', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'wall',
      layerId: layerId(),
      properties: {
        Name:      { type: 'string', value: 'Wall' },
        StartX:    { type: 'number', value: 0 },
        StartY:    { type: 'number', value: 0 },
        EndX:      { type: 'number', value: 5000 },
        EndY:      { type: 'number', value: 0 },
        Height:    { type: 'number', value: 3000 },
        Width:     { type: 'number', value: 200 },
        Material:  { type: 'string', value: 'Concrete' },
        WallType:  { type: 'string', value: 'exterior' },
      },
    });
    expect(prop(id, 'EndX')).toBe(5000);
    expect(prop(id, 'Height')).toBe(3000);
    expect(prop(id, 'Width')).toBe(200);
    expect(prop(id, 'WallType')).toBe('exterior');
  });

  it('wall bounding box spans StartX to EndX', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'wall', layerId: layerId(),
      properties: {
        StartX: { type: 'number', value: 100 }, StartY: { type: 'number', value: 100 },
        EndX:   { type: 'number', value: 3100 }, EndY:   { type: 'number', value: 100 },
      },
    });
    const bb = useDocumentStore.getState().document!.content.elements[id]!.boundingBox;
    expect(bb.min.x).toBe(100);
    expect(bb.max.x).toBe(3100);
  });

  it('wall type can be set via toolParams', () => {
    useDocumentStore.getState().setToolParam('wall', 'wallType', 'curtain');
    useDocumentStore.getState().setToolParam('wall', 'height', 4500);
    const params = useDocumentStore.getState().toolParams['wall'] as Record<string, unknown>;
    expect(params['wallType']).toBe('curtain');
    expect(params['height']).toBe(4500);
  });
});

// ─── T-BIM-002: Door element ─────────────────────────────────────────────────

describe('T-BIM-002: Door element', () => {
  beforeEach(freshStore);

  it('door stores X, Y, Width, Height, Swing', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'door', layerId: layerId(),
      properties: {
        X:      { type: 'number', value: 1000 },
        Y:      { type: 'number', value: 0 },
        Width:  { type: 'number', value: 900 },
        Height: { type: 'number', value: 2100 },
        Swing:  { type: 'number', value: 90 },
      },
    });
    expect(prop(id, 'Width')).toBe(900);
    expect(prop(id, 'Height')).toBe(2100);
    expect(prop(id, 'Swing')).toBe(90);
  });

  it('door bounding box derived from X, Y, Width, Height', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'door', layerId: layerId(),
      properties: {
        X: { type: 'number', value: 500 }, Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 900 }, Height: { type: 'number', value: 2100 },
      },
    });
    const bb = useDocumentStore.getState().document!.content.elements[id]!.boundingBox;
    expect(bb.min.x).toBe(500);
    expect(bb.max.x).toBe(1400);
    expect(bb.max.z).toBe(2100); // door Height maps to Z (elevation axis)
  });
});

// ─── T-BIM-003: Window element ───────────────────────────────────────────────

describe('T-BIM-003: Window element', () => {
  beforeEach(freshStore);

  it('window stores X, Y, Width, Height, SillHeight', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'window', layerId: layerId(),
      properties: {
        X:          { type: 'number', value: 2000 },
        Y:          { type: 'number', value: 0 },
        Width:      { type: 'number', value: 1200 },
        Height:     { type: 'number', value: 1200 },
        SillHeight: { type: 'number', value: 900 },
      },
    });
    expect(prop(id, 'SillHeight')).toBe(900);
    expect(prop(id, 'Width')).toBe(1200);
  });
});

// ─── T-BIM-004: Slab element ─────────────────────────────────────────────────

describe('T-BIM-004: Slab element', () => {
  beforeEach(freshStore);

  it('slab stores X, Y, Width, Height, Depth, Material', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'slab', layerId: layerId(),
      properties: {
        X:        { type: 'number', value: 0 },
        Y:        { type: 'number', value: 0 },
        Width:    { type: 'number', value: 10000 },
        Height:   { type: 'number', value: 8000 },
        Depth:    { type: 'number', value: 250 },
        Material: { type: 'string', value: 'Concrete C30' },
      },
    });
    expect(prop(id, 'Depth')).toBe(250);
    expect(prop(id, 'Width')).toBe(10000);
    expect(prop(id, 'Material')).toBe('Concrete C30');
  });
});

// ─── T-BIM-005: Column element ───────────────────────────────────────────────

describe('T-BIM-005: Column element', () => {
  beforeEach(freshStore);

  it('column stores X, Y, Diameter, Height', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'column', layerId: layerId(),
      properties: {
        X:        { type: 'number', value: 3000 },
        Y:        { type: 'number', value: 3000 },
        Diameter: { type: 'number', value: 400 },
        Height:   { type: 'number', value: 3000 },
      },
    });
    expect(prop(id, 'Diameter')).toBe(400);
  });

  it('column bounding box is a square centred on X, Y with side = Diameter', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'column', layerId: layerId(),
      properties: {
        X: { type: 'number', value: 1000 }, Y: { type: 'number', value: 1000 },
        Diameter: { type: 'number', value: 400 },
      },
    });
    const bb = useDocumentStore.getState().document!.content.elements[id]!.boundingBox;
    expect(bb.min.x).toBe(800);
    expect(bb.max.x).toBe(1200);
    expect(bb.min.y).toBe(800);
    expect(bb.max.y).toBe(1200);
  });
});

// ─── T-BIM-006: Level operations (extended) ─────────────────────────────────

describe('T-BIM-006: Level operations — elevation and height', () => {
  beforeEach(freshStore);

  it('addLevel stores elevation and height', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'Level 2', elevation: 3200, height: 3000 });
    const level = useDocumentStore.getState().document!.organization.levels[levelId]!;
    expect(level.elevation).toBe(3200);
    expect(level.height).toBe(3000);
  });

  it('updateLevel changes elevation', () => {
    const levelId = useDocumentStore.getState().addLevel({ name: 'Roof', elevation: 9000 });
    useDocumentStore.getState().updateLevel(levelId, { elevation: 10000 });
    const level = useDocumentStore.getState().document!.organization.levels[levelId]!;
    expect(level.elevation).toBe(10000);
  });
});

// ─── T-BIM-007: toolParams drive wall/door/window placement ─────────────────

describe('T-BIM-007: toolParams are readable for all BIM tools', () => {
  beforeEach(freshStore);

  it('wall toolParams have default height + wallType (thickness derived by commit logic)', () => {
    const wp = useDocumentStore.getState().toolParams['wall'] as Record<string, unknown>;
    expect(typeof wp?.['height']).toBe('number');
    expect(typeof wp?.['wallType']).toBe('string');
    // thickness + material intentionally absent — commit logic picks
    // ArchiCAD-style defaults by wallType (exterior 300 / interior 150).
  });

  it('door toolParams have default height and width', () => {
    const dp = useDocumentStore.getState().toolParams['door'] as Record<string, unknown>;
    expect(typeof dp?.['height']).toBe('number');
    expect(typeof dp?.['width']).toBe('number');
  });

  it('setToolParam updates a single param without clobbering others', () => {
    useDocumentStore.getState().setToolParam('wall', 'height', 4000);
    const wp = useDocumentStore.getState().toolParams['wall'] as Record<string, unknown>;
    expect(wp?.['height']).toBe(4000);
    // wallType should still be there
    expect(typeof wp?.['wallType']).toBe('string');
  });
});

// ─── T-BIM-008: Space / room element ────────────────────────────────────────

describe('T-BIM-008: Space element', () => {
  beforeEach(freshStore);

  it('space element stores bounding coordinates', () => {
    const id = useDocumentStore.getState().addElement({
      type: 'space', layerId: layerId(),
      properties: {
        Name:   { type: 'string', value: 'Living Room' },
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX:   { type: 'number', value: 5000 },
        EndY:   { type: 'number', value: 4000 },
      },
    });
    const el = useDocumentStore.getState().document!.content.elements[id]!;
    expect(el.type).toBe('space');
    expect(el.boundingBox.max.x).toBe(5000);
    expect(el.boundingBox.max.y).toBe(4000);
  });
});
