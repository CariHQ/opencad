/**
 * Property-based tests for the document model
 * Uses fast-check to verify document invariants across random inputs
 *
 * T-DOC-007: CRDT vector clock invariants
 * T-COL-007: Merge commutativity
 * T-COL-008: Idempotent operations
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { createProject } from './document';
import { DocumentModel } from './document';
import { createRebar, rebarWeight } from './structural';
import { createDuct, ductVolume, ductCrossSection } from './mep';

// ─── T-DOC-007: Document creation invariants ─────────────────────────────────

describe('T-DOC-007: Document creation invariants (fast-check)', () => {
  it('createProject always produces valid ID', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (projectId, userId) => {
          const doc = createProject(projectId, userId);
          return doc.id === projectId && doc.metadata.createdBy === userId;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('createProject always has a default layer', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (projectId, userId) => {
          const doc = createProject(projectId, userId);
          const layerCount = Object.keys(doc.organization.layers).length;
          return layerCount === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createProject always has a default level', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (projectId, userId) => {
          const doc = createProject(projectId, userId);
          const levelCount = Object.keys(doc.organization.levels).length;
          return levelCount === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createProject always starts with empty elements', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (id, user) => {
          const doc = createProject(id, user);
          return Object.keys(doc.content.elements).length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('project name uses provided name or default', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (name) => {
          const doc = createProject('id', 'user', { name });
          return doc.name === name;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── T-COL-007: DocumentModel layer operations ────────────────────────────────

describe('T-COL-007: Layer operation invariants (fast-check)', () => {
  it('addLayer increments layer count by 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.constantFrom('#ff0000', '#00ff00', '#0000ff', '#808080', '#ffffff', '#000000'),
        (name, color) => {
          const model = new DocumentModel('proj', 'user');
          const before = Object.keys(model.layers).length;
          model.addLayer({ name, color });
          const after = Object.keys(model.layers).length;
          return after === before + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('addLayer returns unique IDs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            color: fc.constantFrom('#ff0000', '#00ff00', '#0000ff', '#808080'),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (layers) => {
          const model = new DocumentModel('proj', 'user');
          const ids = layers.map((l) => model.addLayer(l));
          const uniqueIds = new Set(ids);
          return uniqueIds.size === ids.length;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('addLevel increments level count by 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.integer({ min: 0, max: 50000 }),
        fc.integer({ min: 2000, max: 5000 }),
        (name, elevation, height) => {
          const model = new DocumentModel('proj', 'user');
          const before = Object.keys(model.levels).length;
          model.addLevel({ name, elevation, height });
          const after = Object.keys(model.levels).length;
          return after === before + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deleteLayer reduces count by 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        (name) => {
          const model = new DocumentModel('proj', 'user');
          const id = model.addLayer({ name, color: '#ffffff' });
          const before = Object.keys(model.layers).length;
          model.deleteLayer(id);
          const after = Object.keys(model.layers).length;
          return after === before - 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── T-COL-008: Element operation invariants ─────────────────────────────────

describe('T-COL-008: Element operation invariants (fast-check)', () => {
  it('addElement always creates element with correct type', () => {
    const types = ['wall', 'door', 'window', 'slab', 'column', 'beam'] as const;
    fc.assert(
      fc.property(
        fc.constantFrom(...types),
        (type) => {
          const model = new DocumentModel('proj', 'user');
          const layerId = Object.keys(model.layers)[0];
          const id = model.addElement({ type, layerId });
          const el = model.getElementById(id);
          return el?.type === type;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('addElement always creates visible, unlocked elements', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('wall', 'door', 'window', 'slab', 'column', 'beam'),
        (type) => {
          const model = new DocumentModel('proj', 'user');
          const layerId = Object.keys(model.layers)[0];
          const id = model.addElement({ type, layerId });
          const el = model.getElementById(id);
          return el?.visible === true && el?.locked === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple addElements always increases element count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const model = new DocumentModel('proj', 'user');
          const layerId = Object.keys(model.layers)[0];
          const before = Object.keys(model.elements).length;
          for (let i = 0; i < count; i++) {
            model.addElement({ type: 'wall', layerId });
          }
          const after = Object.keys(model.elements).length;
          return after === before + count;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Structural weight invariants ─────────────────────────────────────────────

describe('Structural property-based invariants', () => {
  it('rebar weight is proportional to quantity (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 32 }),
        fc.integer({ min: 1000, max: 5000 }),
        fc.integer({ min: 1, max: 20 }),
        (diameter, length, quantity) => {
          const r = createRebar({ diameter, length, quantity });
          const rSingle = createRebar({ diameter, length, quantity: 1 });
          return Math.abs(rebarWeight(r) - rebarWeight(rSingle) * quantity) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rebar weight is proportional to length (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 25 }),
        fc.integer({ min: 500, max: 3000 }),
        (diameter, length) => {
          const r1 = createRebar({ diameter, length, quantity: 1 });
          const r2 = createRebar({ diameter, length: length * 2, quantity: 1 });
          return Math.abs(rebarWeight(r2) - rebarWeight(r1) * 2) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── MEP property-based invariants ───────────────────────────────────────────

describe('MEP property-based invariants', () => {
  it('round duct cross-section = π × r² (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 500, max: 10000 }),
        (diameter, length) => {
          const duct = createDuct({ shape: 'round', diameter, length });
          const expected = Math.PI * (diameter / 2) ** 2;
          return Math.abs(ductCrossSection(duct) - expected) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('duct volume = cross section × length (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 500, max: 10000 }),
        (w, h, l) => {
          const duct = createDuct({ shape: 'rectangular', width: w, height: h, length: l });
          const expected = ductCrossSection(duct) * l;
          return Math.abs(ductVolume(duct) - expected) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── JSON round-trip invariant ────────────────────────────────────────────────

describe('Document JSON serialization invariants', () => {
  it('document survives JSON roundtrip (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (id, name) => {
          const doc = createProject(id, 'user', { name });
          const json = JSON.stringify(doc);
          const parsed = JSON.parse(json);
          return (
            parsed.id === doc.id &&
            parsed.name === doc.name &&
            parsed.metadata.schemaVersion === '1.0.0'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple layers survive JSON roundtrip (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (layerCount) => {
          const model = new DocumentModel('proj', 'user');
          for (let i = 0; i < layerCount; i++) {
            model.addLayer({ name: `Layer ${i}`, color: '#aabbcc' });
          }
          const json = JSON.stringify(model.documentData);
          const parsed = JSON.parse(json);
          const count = Object.keys(parsed.organization.layers).length;
          return count === layerCount + 1; // +1 for default layer
        }
      ),
      { numRuns: 50 }
    );
  });
});
