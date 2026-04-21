/**
 * T-CERT-002: buildingSMART submission fixtures.
 *
 * Programmatically generates the DocumentSchema fixtures the cert process
 * expects, serialises them via the IFC4 RV path, and attaches a manifest
 * describing which IFC entities each fixture exercises. The submission
 * bundle is the set of { name, ifc-string, manifest } triples this module
 * produces — no binary files to vend, no drift between docs and code.
 */

import type { DocumentSchema, ElementSchema, ElementType } from './types';
import { createProject } from './document';
import { serializeIFC } from './ifc';

export interface CertFixtureManifest {
  /** Stable fixture name — also the IFC file basename the submission uses. */
  name: string;
  /** One-line description for the submission cover sheet. */
  description: string;
  /** IFC entities this fixture exercises; used to prove MVD coverage. */
  entities: string[];
  /** Elements planted in the source document. */
  elementCount: number;
  /** Target MVD — buildingSMART's certification unit. */
  mvd: 'IFC2x3 CV 2.0' | 'IFC4 RV' | 'IFC4 DTV';
}

export interface CertFixture {
  manifest: CertFixtureManifest;
  document: DocumentSchema;
  ifc: string;
}

// ─── Source document builders ────────────────────────────────────────────────

function addElement(doc: DocumentSchema, spec: {
  type: ElementType;
  name: string;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  properties?: ElementSchema['properties'];
}): void {
  const id = crypto.randomUUID();
  const layerId = Object.keys(doc.organization.layers)[0]!;
  const levelId = Object.keys(doc.organization.levels)[0]!;
  doc.content.elements[id] = {
    id,
    type: spec.type,
    properties: {
      Name: { type: 'string', value: spec.name },
      ...(spec.properties ?? {}),
    },
    propertySets: [],
    geometry: { type: 'brep', data: null },
    layerId,
    levelId,
    transform: {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: {
      min: { x: spec.bbox.min[0], y: spec.bbox.min[1], z: spec.bbox.min[2], _type: 'Point3D' },
      max: { x: spec.bbox.max[0], y: spec.bbox.max[1], z: spec.bbox.max[2], _type: 'Point3D' },
    },
    metadata: {
      id,
      createdBy: 'bsi-cert',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: { clock: {} },
    },
    visible: true,
    locked: false,
  };
}

// ─── Fixture factories ───────────────────────────────────────────────────────

function fixtureWalls(): CertFixture {
  const doc = createProject('cert-walls', 'bsi');
  addElement(doc, {
    type: 'wall',
    name: 'North Wall',
    bbox: { min: [0, 0, 0], max: [5000, 200, 3000] },
    properties: {
      StartX: { type: 'number', value: 0 },    StartY: { type: 'number', value: 0 },
      EndX:   { type: 'number', value: 5000 }, EndY:   { type: 'number', value: 0 },
      Height: { type: 'number', value: 3000 }, Thickness: { type: 'number', value: 200 },
    },
  });
  addElement(doc, {
    type: 'wall',
    name: 'East Wall',
    bbox: { min: [5000, 0, 0], max: [5200, 4000, 3000] },
    properties: {
      StartX: { type: 'number', value: 5000 }, StartY: { type: 'number', value: 0 },
      EndX:   { type: 'number', value: 5000 }, EndY:   { type: 'number', value: 4000 },
      Height: { type: 'number', value: 3000 }, Thickness: { type: 'number', value: 200 },
    },
  });
  return {
    document: doc,
    ifc: serializeIFC(doc, { schema: 'IFC4' }),
    manifest: {
      name: 'cert-walls',
      description: 'Two-wall L-junction exercising IfcWall + IfcLocalPlacement + IfcExtrudedAreaSolid.',
      entities: ['IFCWALL', 'IFCLOCALPLACEMENT', 'IFCAXIS2PLACEMENT3D', 'IFCEXTRUDEDAREASOLID'],
      elementCount: 2,
      mvd: 'IFC4 RV',
    },
  };
}

function fixtureSlab(): CertFixture {
  const doc = createProject('cert-slab', 'bsi');
  addElement(doc, {
    type: 'slab',
    name: 'Ground Slab',
    bbox: { min: [0, 0, 0], max: [10000, 8000, 300] },
  });
  return {
    document: doc,
    ifc: serializeIFC(doc, { schema: 'IFC4' }),
    manifest: {
      name: 'cert-slab',
      description: 'Single IfcSlab with rectangular profile and swept-solid representation.',
      entities: ['IFCSLAB', 'IFCEXTRUDEDAREASOLID', 'IFCARBITRARYCLOSEDPROFILEDEF', 'IFCPOLYLINE'],
      elementCount: 1,
      mvd: 'IFC4 RV',
    },
  };
}

function fixtureOpenings(): CertFixture {
  const doc = createProject('cert-openings', 'bsi');
  addElement(doc, {
    type: 'wall',
    name: 'Host Wall',
    bbox: { min: [0, 0, 0], max: [5000, 200, 3000] },
    properties: {
      StartX: { type: 'number', value: 0 },    StartY: { type: 'number', value: 0 },
      EndX:   { type: 'number', value: 5000 }, EndY:   { type: 'number', value: 0 },
      Height: { type: 'number', value: 3000 }, Thickness: { type: 'number', value: 200 },
    },
  });
  addElement(doc, {
    type: 'door',
    name: 'Entry Door',
    bbox: { min: [900, 0, 0], max: [1800, 200, 2100] },
  });
  addElement(doc, {
    type: 'window',
    name: 'North Window',
    bbox: { min: [2500, 0, 900], max: [3500, 200, 2100] },
  });
  return {
    document: doc,
    ifc: serializeIFC(doc, { schema: 'IFC4' }),
    manifest: {
      name: 'cert-openings',
      description: 'Wall with IfcDoor and IfcWindow occurrences hosted inside it.',
      entities: ['IFCWALL', 'IFCDOOR', 'IFCWINDOW'],
      elementCount: 3,
      mvd: 'IFC4 RV',
    },
  };
}

function fixtureMultiStorey(): CertFixture {
  const doc = createProject('cert-multi-storey', 'bsi');
  const l1 = Object.keys(doc.organization.levels)[0]!;
  doc.organization.levels[l1]!.name = 'Ground';
  const l2 = crypto.randomUUID();
  doc.organization.levels[l2] = { id: l2, name: 'Level 1', elevation: 3000, height: 3000, order: 1 };
  const l3 = crypto.randomUUID();
  doc.organization.levels[l3] = { id: l3, name: 'Roof',    elevation: 6000, height: 3000, order: 2 };

  for (let i = 0; i < 3; i++) {
    addElement(doc, {
      type: 'slab',
      name: `Floor ${i}`,
      bbox: { min: [0, 0, i * 3000], max: [5000, 4000, i * 3000 + 300] },
    });
  }
  return {
    document: doc,
    ifc: serializeIFC(doc, { schema: 'IFC4' }),
    manifest: {
      name: 'cert-multi-storey',
      description: 'Three IfcBuildingStorey levels (Ground / Level 1 / Roof) with per-level slabs.',
      entities: ['IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSLAB'],
      elementCount: 3,
      mvd: 'IFC4 RV',
    },
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Every fixture the submission bundle ships. */
export function buildCertFixtureSet(): CertFixture[] {
  return [fixtureWalls(), fixtureSlab(), fixtureOpenings(), fixtureMultiStorey()];
}

/** Manifest for the whole submission (cover sheet data). */
export interface CertSubmission {
  producedAt: number;
  mvd: 'IFC2x3 CV 2.0' | 'IFC4 RV' | 'IFC4 DTV';
  fixtures: CertFixtureManifest[];
  entitiesCovered: string[];
}

export function buildCertSubmission(): CertSubmission {
  const fixtures = buildCertFixtureSet();
  const entitiesCovered = Array.from(
    new Set(fixtures.flatMap((f) => f.manifest.entities)),
  ).sort();
  return {
    producedAt: Date.now(),
    mvd: 'IFC4 RV',
    fixtures: fixtures.map((f) => f.manifest),
    entitiesCovered,
  };
}
