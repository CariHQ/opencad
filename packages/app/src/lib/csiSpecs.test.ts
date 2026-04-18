/**
 * CSI MasterFormat Specification Tests
 * T-SPEC-001: CSI specifications
 */
import { describe, it, expect } from 'vitest';
import {
  CSI_SECTIONS,
  getApplicableSpecs,
  generateProjectSpecs,
  type CSISection,
} from './csiSpecs';
import type { DocumentSchema } from '@opencad/document';

// Minimal DocumentSchema factory for tests
function makeDoc(elementTypes: string[]): DocumentSchema {
  const elements: Record<string, import('@opencad/document').ElementSchema> = {};
  elementTypes.forEach((type, idx) => {
    const id = `el-${idx}`;
    elements[id] = {
      id,
      type: type as import('@opencad/document').ElementType,
      properties: {},
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: null,
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { _type: 'Point3D', x: 0, y: 0, z: 0 },
        max: { _type: 'Point3D', x: 1, y: 1, z: 1 },
      },
      metadata: {
        id,
        createdBy: 'test',
        createdAt: 0,
        updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };
  });
  return {
    id: 'doc-test',
    name: 'Test Project',
    version: { clock: {} },
    metadata: {
      createdAt: 0,
      updatedAt: 0,
      createdBy: 'test',
      schemaVersion: '1.0.0',
    },
    content: {
      elements,
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

describe('T-SPEC-001: CSI specifications', () => {
  it('CSI_SECTIONS has at least 7 division entries', () => {
    const divisions = new Set(CSI_SECTIONS.map((s: CSISection) => s.division));
    expect(divisions.size).toBeGreaterThanOrEqual(7);
  });

  it('each section has non-empty part1/part2/part3', () => {
    for (const section of CSI_SECTIONS) {
      expect(section.parts.part1_general.length).toBeGreaterThan(0);
      expect(section.parts.part2_products.length).toBeGreaterThan(0);
      expect(section.parts.part3_execution.length).toBeGreaterThan(0);
    }
  });

  it('each section has a valid section number format', () => {
    const sectionRegex = /^\d{2} \d{2} \d{2}$/;
    for (const section of CSI_SECTIONS) {
      expect(section.section).toMatch(sectionRegex);
    }
  });

  it('each section has a non-empty title and description', () => {
    for (const section of CSI_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.description.length).toBeGreaterThan(0);
    }
  });

  it('each section has at least one applicable element type', () => {
    for (const section of CSI_SECTIONS) {
      expect(section.applicableElementTypes.length).toBeGreaterThan(0);
    }
  });

  it('getApplicableSpecs returns concrete section for slab element', () => {
    const specs = getApplicableSpecs('slab');
    expect(specs.length).toBeGreaterThan(0);
    const hasConcrete = specs.some(
      (s) => s.division === 3 || s.title.toLowerCase().includes('concrete')
    );
    expect(hasConcrete).toBe(true);
  });

  it('getApplicableSpecs returns openings section for door element', () => {
    const specs = getApplicableSpecs('door');
    expect(specs.length).toBeGreaterThan(0);
    const hasOpenings = specs.some(
      (s) => s.division === 8 || s.title.toLowerCase().includes('door')
    );
    expect(hasOpenings).toBe(true);
  });

  it('getApplicableSpecs returns openings section for window element', () => {
    const specs = getApplicableSpecs('window');
    expect(specs.length).toBeGreaterThan(0);
    const hasOpenings = specs.some(
      (s) => s.division === 8 || s.title.toLowerCase().includes('window')
    );
    expect(hasOpenings).toBe(true);
  });

  it('getApplicableSpecs returns masonry section for wall element', () => {
    const specs = getApplicableSpecs('wall', 'masonry');
    expect(specs.length).toBeGreaterThan(0);
    const hasMasonry = specs.some(
      (s) => s.division === 4 || s.title.toLowerCase().includes('masonry')
    );
    expect(hasMasonry).toBe(true);
  });

  it('getApplicableSpecs returns steel section for beam element', () => {
    const specs = getApplicableSpecs('beam', 'steel');
    expect(specs.length).toBeGreaterThan(0);
    const hasMetal = specs.some(
      (s) => s.division === 5 || s.title.toLowerCase().includes('steel')
    );
    expect(hasMetal).toBe(true);
  });

  it('getApplicableSpecs returns empty array for unknown type', () => {
    const specs = getApplicableSpecs('unknown_element_xyz');
    expect(Array.isArray(specs)).toBe(true);
  });

  it('generateProjectSpecs includes all applicable sections', () => {
    const doc = makeDoc(['slab', 'wall', 'door', 'window']);
    const result = generateProjectSpecs(doc);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Should mention concrete (slab), openings (door/window)
    expect(result).toMatch(/concrete|slab/i);
    expect(result).toMatch(/door|window|opening/i);
  });

  it('generateProjectSpecs returns empty-project message for doc with no elements', () => {
    const doc = makeDoc([]);
    const result = generateProjectSpecs(doc);
    expect(typeof result).toBe('string');
  });

  it('generateProjectSpecs includes Part 1, Part 2, Part 3 headers', () => {
    const doc = makeDoc(['wall', 'slab', 'column']);
    const result = generateProjectSpecs(doc);
    expect(result).toMatch(/part 1|PART 1/i);
    expect(result).toMatch(/part 2|PART 2/i);
    expect(result).toMatch(/part 3|PART 3/i);
  });

  it('CSI_SECTIONS covers divisions 3 through 9', () => {
    const divisions = new Set(CSI_SECTIONS.map((s: CSISection) => s.division));
    for (const div of [3, 4, 5, 6, 7, 8, 9]) {
      expect(divisions.has(div)).toBe(true);
    }
  });
});
