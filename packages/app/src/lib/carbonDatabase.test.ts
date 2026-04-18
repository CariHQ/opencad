import { describe, it, expect } from 'vitest';
import {
  CARBON_DATABASE,
  CARBON_BENCHMARKS,
  calculateElementCarbon,
  calculateProjectCarbon,
} from './carbonDatabase';
import type { ElementSchema, DocumentSchema } from '@opencad/document';

// ---------------------------------------------------------------------------
// Helpers to build minimal test fixtures
// ---------------------------------------------------------------------------

function makeElement(
  overrides: Partial<ElementSchema> & { materialId?: string; volume?: number }
): ElementSchema {
  const { materialId, volume, ...rest } = overrides;

  // Default bounding box produces a 1 m³ cube
  const side = volume !== undefined ? Math.cbrt(volume) : 1;
  const defaultBB = {
    min: { _type: 'Point3D' as const, x: 0, y: 0, z: 0 },
    max: { _type: 'Point3D' as const, x: side, y: side, z: side },
  };

  return {
    id: 'el-1',
    type: 'wall',
    properties: materialId
      ? { material: { type: 'string', value: materialId } }
      : {},
    propertySets: [],
    geometry: { type: 'brep', data: null },
    layerId: 'layer-1',
    levelId: null,
    transform: {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: defaultBB,
    metadata: {
      id: 'el-1',
      createdBy: 'test',
      createdAt: 0,
      updatedAt: 0,
      version: { clock: {} },
    },
    visible: true,
    locked: false,
    ...rest,
  };
}

function makeDoc(elements: ElementSchema[]): DocumentSchema {
  const elementsRecord: Record<string, ElementSchema> = {};
  for (const el of elements) {
    elementsRecord[el.id] = el;
  }
  return {
    id: 'doc-1',
    name: 'Test Project',
    version: { clock: {} },
    metadata: {
      createdAt: 0,
      updatedAt: 0,
      createdBy: 'test',
      schemaVersion: '1.0',
    },
    content: {
      elements: elementsRecord,
      spaces: {},
    },
    organization: {
      layers: {},
      levels: {},
    },
    presentation: {
      views: {},
      annotations: {},
    },
    library: {
      materials: {},
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('T-CARBON-001: Carbon calculation', () => {
  it('calculateElementCarbon returns correct mass for known wall', () => {
    // Concrete wall: 2 m³, density 2400 kg/m³ → mass 4800 kg, GWP 0.159 → 763.2 kgCO2e
    const element = makeElement({ materialId: 'Concrete', volume: 2 });
    const result = calculateElementCarbon(element);

    expect(result).not.toBeNull();
    expect(result!.mass).toBeCloseTo(2 * 2400, 0);
    expect(result!.embodiedCarbon).toBeCloseTo(2 * 2400 * 0.159, 4);
    expect(result!.materialId).toBe('Concrete');
    expect(result!.elementType).toBe('wall');
    expect(result!.gwp).toBe(0.159);
  });

  it('calculateElementCarbon returns null for elements without geometry', () => {
    // Zero-sized bounding box → no volume
    const element = makeElement({ materialId: 'Steel' });
    element.boundingBox = {
      min: { _type: 'Point3D', x: 0, y: 0, z: 0 },
      max: { _type: 'Point3D', x: 0, y: 0, z: 0 },
    };
    const result = calculateElementCarbon(element);
    expect(result).toBeNull();
  });

  it('calculateElementCarbon returns null for elements without a material', () => {
    const element = makeElement({});
    const result = calculateElementCarbon(element);
    expect(result).toBeNull();
  });

  it('calculateElementCarbon returns null for unrecognised material IDs', () => {
    const element = makeElement({ materialId: 'UnknownMaterialXYZ' });
    const result = calculateElementCarbon(element);
    expect(result).toBeNull();
  });

  it('calculateProjectCarbon sums all element carbons', () => {
    const el1 = makeElement({ id: 'e1', materialId: 'Concrete', volume: 1 });
    const el2 = makeElement({ id: 'e2', materialId: 'Steel', volume: 1 });
    const doc = makeDoc([el1, el2]);

    const summary = calculateProjectCarbon(doc);

    const concreteCO2 = 1 * 2400 * 0.159;
    const steelCO2 = 1 * 7850 * 1.74;
    expect(summary.totalEmbodiedCarbon).toBeCloseTo(concreteCO2 + steelCO2, 2);
    expect(summary.elements).toHaveLength(2);
  });

  it('CARBON_DATABASE has non-zero GWP for all materials', () => {
    for (const entry of CARBON_DATABASE) {
      expect(entry.gwp).toBeGreaterThan(0);
    }
  });

  it('CARBON_DATABASE has positive density for all materials', () => {
    for (const entry of CARBON_DATABASE) {
      expect(entry.density).toBeGreaterThan(0);
    }
  });

  it('CARBON_DATABASE has a non-empty source for all materials', () => {
    for (const entry of CARBON_DATABASE) {
      expect(entry.source.length).toBeGreaterThan(0);
    }
  });

  it('byMaterial totals equal total embodied carbon', () => {
    const el1 = makeElement({ id: 'e1', materialId: 'Concrete', volume: 2 });
    const el2 = makeElement({ id: 'e2', materialId: 'Concrete', volume: 3 });
    const el3 = makeElement({ id: 'e3', materialId: 'Steel', volume: 1 });
    const doc = makeDoc([el1, el2, el3]);

    const summary = calculateProjectCarbon(doc);
    const byMaterialTotal = Object.values(summary.byMaterial).reduce((s, v) => s + v, 0);

    expect(byMaterialTotal).toBeCloseTo(summary.totalEmbodiedCarbon, 5);
  });

  it('byElementType totals equal total embodied carbon', () => {
    const wall = makeElement({ id: 'e1', type: 'wall', materialId: 'Brick', volume: 1 });
    const slab = makeElement({ id: 'e2', type: 'slab', materialId: 'Concrete', volume: 2 });
    const doc = makeDoc([wall, slab]);

    const summary = calculateProjectCarbon(doc);
    const byTypeTotal = Object.values(summary.byElementType).reduce((s, v) => s + v, 0);

    expect(byTypeTotal).toBeCloseTo(summary.totalEmbodiedCarbon, 5);
  });

  it('calculateProjectCarbon returns zero for an empty document', () => {
    const doc = makeDoc([]);
    const summary = calculateProjectCarbon(doc);
    expect(summary.totalEmbodiedCarbon).toBe(0);
    expect(summary.elements).toHaveLength(0);
    expect(Object.keys(summary.byMaterial)).toHaveLength(0);
  });

  it('CARBON_DATABASE includes all required ICE materials', () => {
    const ids = CARBON_DATABASE.map((d) => d.materialId);
    expect(ids).toContain('Concrete');
    expect(ids).toContain('Steel');
    expect(ids).toContain('Wood');
    expect(ids).toContain('Brick');
    expect(ids).toContain('Glass');
    expect(ids).toContain('Aluminum');
    expect(ids).toContain('Insulation');
  });

  it('CARBON_BENCHMARKS has positive kgCO2ePerM2 for all benchmarks', () => {
    for (const benchmark of Object.values(CARBON_BENCHMARKS)) {
      expect(benchmark.kgCO2ePerM2).toBeGreaterThan(0);
      expect(benchmark.name.length).toBeGreaterThan(0);
    }
  });
});
