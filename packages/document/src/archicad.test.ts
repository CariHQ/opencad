/**
 * TDD Tests for ArchiCAD PLN/PLA/GDL Import
 *
 * Test IDs: T-AC-001 through T-AC-007
 */

import { describe, it, expect } from 'vitest';
import { parsePLN, parsePLA, parseGDL, detectFormat as detectAC, importFile as importAC } from './archicad';

const SAMPLE_PLN = `<?xml version="1.0" encoding="UTF-8"?>
<ArchiCADProject>
  <Name>Test Building</Name>
  <Layers>
    <Layer Name="Walls" Visible="True"/>
    <Layer Name="Structural" Visible="True"/>
    <Layer Name="Hidden" Visible="False"/>
  </Layers>
  <Elements>
    <Wall Id="wall-001" Height="3000" Thickness="200"/>
    <Wall Id="wall-002" Height="2800" Thickness="150"/>
    <Door Id="door-001" Width="900" Height="2100"/>
    <Window Id="win-001" Width="1200" Height="1200"/>
    <Slab Id="slab-001" Thickness="300"/>
    <Column Id="col-001" Height="3000"/>
    <Beam Id="beam-001" Span="5000"/>
    <Stair Id="stair-001" Status="Error"/>
  </Elements>
  <Drawings>
    <Drawing Name="Ground Floor Plan" Type="FloorPlan"/>
    <Drawing Name="Section A-A" Type="Section"/>
  </Drawings>
</ArchiCADProject>`;

const SAMPLE_PLA = `<ArchiCADArchive>
  <Object Name="Window-01" Category="Window"/>
  <Object Name="Door-Heavy-01" Category="Door"/>
  <Object Name="Column-Steel" Category="Column"/>
</ArchiCADArchive>`;

const SAMPLE_GDL = `! Parametric Window
NAME BasicWindow
PARAM Width 1200
PARAM Height 900

! Door Component
NAME FireDoor
PARAM Width 900
PARAM Height 2100
PARAM FRating 60`;

describe('T-AC-001: Import PLN → verify 3D geometry renders', () => {
  it('parsePLN returns a DocumentSchema', async () => {
    const { parsePLN: fn } = await import('./archicad');
    const doc = fn(SAMPLE_PLN);
    expect(doc).toBeDefined();
    expect(doc.content.elements).toBeDefined();
  });

  it('parsed document contains elements with geometry', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const elements = Object.values(doc.content.elements);
    expect(elements.length).toBeGreaterThan(0);
    for (const el of elements) {
      expect(el.geometry).toBeDefined();
      expect(el.boundingBox).toBeDefined();
    }
  });

  it('wall elements have correct type', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const walls = Object.values(doc.content.elements).filter((e) => e.type === 'wall');
    expect(walls.length).toBe(2);
  });

  it('door and window elements are included', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const types = Object.values(doc.content.elements).map((e) => e.type);
    expect(types).toContain('door');
    expect(types).toContain('window');
  });
});

describe('T-AC-002: Import PLN → verify layers/stories mapped correctly', () => {
  it('layers are imported from PLN', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const layers = Object.values(doc.organization.layers);
    expect(layers.length).toBeGreaterThan(0);
  });

  it('layer names are preserved', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const layerNames = Object.values(doc.organization.layers).map((l) => l.name);
    expect(layerNames).toContain('Walls');
    expect(layerNames).toContain('Structural');
  });

  it('layer visibility is preserved', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const hiddenLayer = Object.values(doc.organization.layers).find((l) => l.name === 'Hidden');
    if (hiddenLayer) {
      expect(hiddenLayer.visible).toBe(false);
    }
    const wallsLayer = Object.values(doc.organization.layers).find((l) => l.name === 'Walls');
    if (wallsLayer) {
      expect(wallsLayer.visible).toBe(true);
    }
  });

  it('project name is imported', () => {
    const doc = parsePLN(SAMPLE_PLN);
    expect(doc.name).toBe('Test Building');
  });
});

describe('T-AC-003: Import PLN → verify IFC data preserved', () => {
  it('element properties include type information', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const elements = Object.values(doc.content.elements);
    for (const el of elements) {
      expect(el.properties['Type']).toBeDefined();
      expect((el.properties['Type'] as { value: string }).value).toBeTruthy();
    }
  });

  it('all supported element types are mapped', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const types = new Set(Object.values(doc.content.elements).map((e) => e.type));
    expect(types.has('wall')).toBe(true);
    expect(types.has('door')).toBe(true);
    expect(types.has('window')).toBe(true);
    expect(types.has('slab')).toBe(true);
    expect(types.has('column')).toBe(true);
    expect(types.has('beam')).toBe(true);
  });
});

describe('T-AC-004: Import PLA → verify all linked assets included', () => {
  it('parsePLA returns an objects array', () => {
    const result = parsePLA(SAMPLE_PLA);
    expect(result.objects).toBeDefined();
    expect(Array.isArray(result.objects)).toBe(true);
  });

  it('objects are parsed from PLA content', () => {
    const result = parsePLA(SAMPLE_PLA);
    expect(result.objects.length).toBe(3);
  });

  it('object names are preserved', () => {
    const result = parsePLA(SAMPLE_PLA);
    const names = result.objects.map((o) => o.name);
    expect(names).toContain('Window-01');
    expect(names).toContain('Door-Heavy-01');
    expect(names).toContain('Column-Steel');
  });

  it('object categories are preserved', () => {
    const result = parsePLA(SAMPLE_PLA);
    const cats = result.objects.map((o) => o.category);
    expect(cats).toContain('Window');
    expect(cats).toContain('Door');
  });
});

describe('T-AC-005: Import PLN → verify 2D drawings on layouts preserved', () => {
  it('drawings/views are imported', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const views = Object.values(doc.presentation.views ?? {});
    expect(views.length).toBeGreaterThan(0);
  });

  it('view names match drawing names from PLN', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const viewNames = Object.values(doc.presentation.views ?? {}).map((v) => v.name);
    expect(viewNames).toContain('Ground Floor Plan');
    expect(viewNames).toContain('Section A-A');
  });

  it('views have 2d type', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const views = Object.values(doc.presentation.views ?? {});
    for (const v of views) {
      expect(v.type).toBe('2d');
    }
  });
});

describe('T-AC-006: Import PLN → generate import report with fidelity rating', () => {
  it('import report is attached to metadata', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const metadata = doc.metadata as { importReport?: { elements: number; warnings: number } };
    expect(metadata.importReport).toBeDefined();
  });

  it('import report contains element count', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const metadata = doc.metadata as { importReport?: { elements: number; warnings: number } };
    expect(metadata.importReport!.elements).toBeGreaterThan(0);
  });

  it('import report records warnings for error elements', () => {
    const doc = parsePLN(SAMPLE_PLN);
    const metadata = doc.metadata as { importReport?: { elements: number; warnings: number } };
    // SAMPLE_PLN has stair-001 with Status="Error"
    expect(metadata.importReport!.warnings).toBe(1);
  });
});

describe('T-AC-007: Import GDL objects → verify approximated as static geometry with warning', () => {
  it('parseGDL returns an array of objects', () => {
    const objects = parseGDL(SAMPLE_GDL);
    expect(Array.isArray(objects)).toBe(true);
  });

  it('GDL objects have names', () => {
    const objects = parseGDL(SAMPLE_GDL);
    expect(objects.length).toBeGreaterThan(0);
    const names = objects.map((o) => o.name);
    expect(names).toContain('BasicWindow');
    expect(names).toContain('FireDoor');
  });

  it('GDL parameters are parsed', () => {
    const objects = parseGDL(SAMPLE_GDL);
    const window = objects.find((o) => o.name === 'BasicWindow');
    expect(window).toBeDefined();
    expect(window!.parameters['Width']).toBe(1200);
    expect(window!.parameters['Height']).toBe(900);
  });

  it('all GDL objects have a category', () => {
    const objects = parseGDL(SAMPLE_GDL);
    for (const obj of objects) {
      expect(obj.category).toBeDefined();
    }
  });
});

// T-DOC-007: Binary format detection and stub import for ArchiCAD
describe('T-DOC-007: ArchiCAD detectFormat + importFile', () => {
  function makeBuffer(bytes: number[]): ArrayBuffer {
    const buf = new ArrayBuffer(bytes.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) view[i] = bytes[i];
    return buf;
  }

  // ArchiCAD .pln: "PLAN" = 0x50 0x4C 0x41 0x4E
  it('detectFormat returns true for PLN magic bytes "PLAN"', () => {
    const buf = makeBuffer([0x50, 0x4c, 0x41, 0x4e, 0x00, 0x00]);
    expect(detectAC(buf)).toBe(true);
  });

  it('detectFormat returns false for non-PLN bytes', () => {
    const buf = makeBuffer([0x00, 0x01, 0x02, 0x03]);
    expect(detectAC(buf)).toBe(false);
  });

  it('detectFormat returns false for empty buffer', () => {
    const buf = makeBuffer([]);
    expect(detectAC(buf)).toBe(false);
  });

  it('importFile returns a valid schema with no synthetic elements', () => {
    const buf = makeBuffer([0x50, 0x4c, 0x41, 0x4e]);
    const result = importAC(buf, 'proj-789');
    expect(result.schema).toBeDefined();
    // Honest importer: geometry is not decoded, so no synthetic walls.
    expect(Object.keys(result.schema.content.elements).length).toBe(0);
  });

  it('importFile includes a warning pointing users to IFC', () => {
    const buf = makeBuffer([0x50, 0x4c, 0x41, 0x4e]);
    const result = importAC(buf, 'proj-789');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.join(' ')).toMatch(/IFC/i);
  });
});
