/**
 * T-DXF-046: DXF round-trip fidelity
 *
 * Fidelity-focused tests that catch regressions in the DXF adapter by
 * asserting that dimensional, colour, and semantic data survive a full
 * export → import cycle.
 */

import { describe, it, expect } from 'vitest';
import { exportDXF, importDXF } from './dwg';
import { createProject, addElement } from './document';

// ─── Geometry fidelity ───────────────────────────────────────────────────────

describe('T-DXF-046: geometry fidelity', () => {
  it('LINE endpoints survive a round-trip', () => {
    const doc = createProject('dxf-line', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'line',
      properties: {
        StartX: { type: 'number', value: 100 },
        StartY: { type: 'number', value: 200 },
        EndX:   { type: 'number', value: 500 },
        EndY:   { type: 'number', value: 800 },
      },
      points: [
        { x: 100, y: 200, z: 0, _type: 'Point3D' },
        { x: 500, y: 800, z: 0, _type: 'Point3D' },
      ],
      layerId, levelId,
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const line = Object.values(result.value.content.elements).find((e) => e.type === 'line');
    expect(line).toBeDefined();
    expect(Number(line!.properties['StartX']?.value)).toBeCloseTo(100, 2);
    expect(Number(line!.properties['StartY']?.value)).toBeCloseTo(200, 2);
    expect(Number(line!.properties['EndX']?.value)).toBeCloseTo(500, 2);
    expect(Number(line!.properties['EndY']?.value)).toBeCloseTo(800, 2);
  });

  it('CIRCLE radius survives a round-trip', () => {
    const doc = createProject('dxf-circle', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'circle',
      properties: {
        CenterX: { type: 'number', value: 250 },
        CenterY: { type: 'number', value: 400 },
        Radius:  { type: 'number', value: 123.45 },
      },
      layerId, levelId,
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const circle = Object.values(result.value.content.elements).find((e) => e.type === 'circle');
    expect(circle).toBeDefined();
    expect(Number(circle!.properties['Radius']?.value)).toBeCloseTo(123.45, 2);
  });

  it('ARC center, radius, and angles survive', () => {
    const doc = createProject('dxf-arc', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'arc',
      properties: {
        CenterX:    { type: 'number', value: 0 },
        CenterY:    { type: 'number', value: 0 },
        Radius:     { type: 'number', value: 500 },
        StartAngle: { type: 'number', value: 45 },
        EndAngle:   { type: 'number', value: 135 },
      },
      layerId, levelId,
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const arc = Object.values(result.value.content.elements).find((e) => e.type === 'arc');
    expect(arc).toBeDefined();
    expect(Number(arc!.properties['Radius']?.value)).toBeCloseTo(500, 2);
    expect(Number(arc!.properties['StartAngle']?.value)).toBeCloseTo(45, 2);
    expect(Number(arc!.properties['EndAngle']?.value)).toBeCloseTo(135, 2);
  });

  it('POLYLINE vertex coordinates survive', () => {
    const doc = createProject('dxf-poly', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    const pts = [
      { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
      { x: 100, y: 0, z: 0, _type: 'Point3D' as const },
      { x: 100, y: 200, z: 0, _type: 'Point3D' as const },
      { x: 0, y: 200, z: 0, _type: 'Point3D' as const },
    ];
    addElement(doc, {
      type: 'polyline',
      properties: {
        Points: { type: 'string', value: JSON.stringify(pts.map((p) => ({ x: p.x, y: p.y }))) },
      },
      points: pts,
      layerId, levelId,
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const poly = Object.values(result.value.content.elements).find((e) => e.type === 'polyline');
    expect(poly).toBeDefined();
    const raw = String(poly!.properties['Points']?.value ?? '[]');
    const parsed = JSON.parse(raw) as Array<{ x: number; y: number }>;
    expect(parsed.length).toBe(4);
    expect(parsed[2]).toEqual(expect.objectContaining({ x: 100, y: 200 }));
  });

  it('ELLIPSE survives a round-trip with approximate radii', () => {
    const doc = createProject('dxf-ellipse', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'ellipse',
      properties: {
        CenterX:  { type: 'number', value: 10 },
        CenterY:  { type: 'number', value: 20 },
        RadiusX:  { type: 'number', value: 400 },
        RadiusY:  { type: 'number', value: 200 },
        Rotation: { type: 'number', value: 0 },
      },
      layerId, levelId,
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ellipse = Object.values(result.value.content.elements).find((e) => e.type === 'ellipse');
    expect(ellipse).toBeDefined();
    expect(Number(ellipse!.properties['RadiusX']?.value)).toBeCloseTo(400, 1);
    expect(Number(ellipse!.properties['RadiusY']?.value)).toBeCloseTo(200, 1);
  });
});

// ─── Text fidelity ───────────────────────────────────────────────────────────

describe('T-DXF-046: text fidelity', () => {
  it('TEXT content and font size survive a round-trip', () => {
    const doc = createProject('dxf-text', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'text',
      properties: {
        X:        { type: 'number', value: 50 },
        Y:        { type: 'number', value: 75 },
        Content:  { type: 'string', value: 'Office 101' },
        FontSize: { type: 'number', value: 5 },
      },
      layerId, levelId,
      transform: { translation: { x: 50, y: 75, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const text = Object.values(result.value.content.elements).find((e) => e.type === 'text');
    expect(text).toBeDefined();
    expect(String(text!.properties['Content']?.value)).toBe('Office 101');
    expect(Number(text!.properties['FontSize']?.value)).toBeCloseTo(5, 2);
  });
});

// ─── Block reference fidelity ────────────────────────────────────────────────

describe('T-DXF-046: block reference fidelity', () => {
  it('INSERT block name, rotation, and scale survive', () => {
    const doc = createProject('dxf-block', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'block_ref',
      properties: {
        BlockName: { type: 'string', value: 'DOOR_STD' },
        Rotation:  { type: 'number', value: 90 },
        ScaleX:    { type: 'number', value: 1.5 },
        ScaleY:    { type: 'number', value: 1.5 },
        ScaleZ:    { type: 'number', value: 1 },
      },
      layerId, levelId,
      transform: { translation: { x: 100, y: 200, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1 } },
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const block = Object.values(result.value.content.elements).find((e) => e.type === 'block_ref');
    expect(block).toBeDefined();
    expect(String(block!.properties['BlockName']?.value)).toBe('DOOR_STD');
    expect(Number(block!.properties['Rotation']?.value)).toBeCloseTo(90, 2);
    expect(Number(block!.properties['ScaleX']?.value)).toBeCloseTo(1.5, 2);
    expect(Number(block!.properties['ScaleY']?.value)).toBeCloseTo(1.5, 2);
  });
});

// ─── Layer fidelity ──────────────────────────────────────────────────────────

describe('T-DXF-046: layer fidelity', () => {
  it('Multiple layers with distinct names survive', () => {
    const doc = createProject('dxf-layers', 'tester');
    const levelId = Object.keys(doc.organization.levels)[0]!;

    for (const name of ['Walls', 'Doors', 'Grid', 'Annotation']) {
      const id = crypto.randomUUID();
      doc.organization.layers[id] = {
        id, name,
        color: '#808080',
        visible: true,
        locked: false,
        order: Object.keys(doc.organization.layers).length,
      };
      addElement(doc, {
        type: 'line',
        properties: {
          StartX: { type: 'number', value: 0 },
          StartY: { type: 'number', value: 0 },
          EndX:   { type: 'number', value: 100 },
          EndY:   { type: 'number', value: 0 },
        },
        points: [
          { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
          { x: 100, y: 0, z: 0, _type: 'Point3D' as const },
        ],
        layerId: id, levelId,
      });
    }

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const layerNames = Object.values(result.value.organization.layers).map((l) => l.name);
    expect(layerNames).toEqual(expect.arrayContaining(['Walls', 'Doors', 'Grid', 'Annotation']));
  });

  it('Layer colour round-trips to the same ACI', () => {
    const doc = createProject('dxf-layer-color', 'tester');
    const levelId = Object.keys(doc.organization.levels)[0]!;
    const id = crypto.randomUUID();
    doc.organization.layers[id] = {
      id, name: 'RedLayer',
      color: '#FF0000',
      visible: true,
      locked: false,
      order: 1,
    };
    addElement(doc, {
      type: 'line',
      properties: {
        StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 },
        EndX:   { type: 'number', value: 1 }, EndY:   { type: 'number', value: 1 },
      },
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
        { x: 1, y: 1, z: 0, _type: 'Point3D' as const },
      ],
      layerId: id, levelId,
    });

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const red = Object.values(result.value.organization.layers).find((l) => l.name === 'RedLayer');
    expect(red).toBeDefined();
    expect(red!.color.toUpperCase()).toBe('#FF0000');
  });
});

// ─── Count fidelity ──────────────────────────────────────────────────────────

describe('T-DXF-046: count fidelity', () => {
  it('20 lines in = 20 lines out', () => {
    const doc = createProject('dxf-count', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;

    for (let i = 0; i < 20; i++) {
      addElement(doc, {
        type: 'line',
        properties: {
          StartX: { type: 'number', value: i * 100 }, StartY: { type: 'number', value: 0 },
          EndX:   { type: 'number', value: i * 100 + 50 }, EndY: { type: 'number', value: 50 },
        },
        points: [
          { x: i * 100, y: 0, z: 0, _type: 'Point3D' as const },
          { x: i * 100 + 50, y: 50, z: 0, _type: 'Point3D' as const },
        ],
        layerId, levelId,
      });
    }

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lines = Object.values(result.value.content.elements).filter((e) => e.type === 'line');
    expect(lines.length).toBe(20);
  });

  it('mixed 15-element document preserves every entity', () => {
    const doc = createProject('dxf-mixed', 'tester');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;

    addElement(doc, {
      type: 'line',
      properties: { StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: 1 }, EndY: { type: 'number', value: 1 } },
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
        { x: 1, y: 1, z: 0, _type: 'Point3D' as const },
      ],
      layerId, levelId,
    });
    for (let i = 0; i < 5; i++) {
      addElement(doc, {
        type: 'circle',
        properties: {
          CenterX: { type: 'number', value: i }, CenterY: { type: 'number', value: i }, Radius: { type: 'number', value: 10 },
        },
        layerId, levelId,
      });
    }
    for (let i = 0; i < 5; i++) {
      addElement(doc, {
        type: 'arc',
        properties: {
          CenterX: { type: 'number', value: i }, CenterY: { type: 'number', value: i },
          Radius: { type: 'number', value: 20 }, StartAngle: { type: 'number', value: 0 }, EndAngle: { type: 'number', value: 90 },
        },
        layerId, levelId,
      });
    }
    for (let i = 0; i < 4; i++) {
      const pts = [
        { x: i, y: 0, z: 0, _type: 'Point3D' as const },
        { x: i + 10, y: 0, z: 0, _type: 'Point3D' as const },
        { x: i + 10, y: 10, z: 0, _type: 'Point3D' as const },
      ];
      addElement(doc, {
        type: 'polyline',
        properties: { Points: { type: 'string', value: JSON.stringify(pts.map((p) => ({ x: p.x, y: p.y }))) } },
        points: pts,
        layerId, levelId,
      });
    }

    const result = importDXF(exportDXF(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const elements = Object.values(result.value.content.elements);
    expect(elements.filter((e) => e.type === 'line').length).toBe(1);
    expect(elements.filter((e) => e.type === 'circle').length).toBe(5);
    expect(elements.filter((e) => e.type === 'arc').length).toBe(5);
    expect(elements.filter((e) => e.type === 'polyline').length).toBe(4);
  });
});
