/**
 * T-SITE-01: Landscape element types — schema, type guard, factory, IFC export.
 */
import { describe, it, expect } from 'vitest';
import {
  isLandscapeElement,
  LANDSCAPE_ELEMENT_TYPES,
  type LandscapeProperties,
} from './types';
import { addElement, createProject } from './document';
import { IFCAdapter } from './ifc';

// ── Type guard ────────────────────────────────────────────────────────────────

describe('T-SITE-01: isLandscapeElement', () => {
  const landscapeTypes = ['planting', 'rock', 'site_furniture', 'person', 'vehicle', 'terrain_contour'] as const;
  const nonLandscapeTypes = ['wall', 'door', 'slab', 'duct', 'topography', 'annotation', 'line'] as const;

  for (const t of landscapeTypes) {
    it(`returns true for "${t}"`, () => {
      expect(isLandscapeElement({ type: t } as never)).toBe(true);
    });
  }

  for (const t of nonLandscapeTypes) {
    it(`returns false for "${t}"`, () => {
      expect(isLandscapeElement({ type: t } as never)).toBe(false);
    });
  }
});

describe('T-SITE-01: LANDSCAPE_ELEMENT_TYPES set', () => {
  it('contains all 6 landscape types', () => {
    expect(LANDSCAPE_ELEMENT_TYPES.size).toBe(6);
    expect(LANDSCAPE_ELEMENT_TYPES.has('planting')).toBe(true);
    expect(LANDSCAPE_ELEMENT_TYPES.has('rock')).toBe(true);
    expect(LANDSCAPE_ELEMENT_TYPES.has('site_furniture')).toBe(true);
    expect(LANDSCAPE_ELEMENT_TYPES.has('person')).toBe(true);
    expect(LANDSCAPE_ELEMENT_TYPES.has('vehicle')).toBe(true);
    expect(LANDSCAPE_ELEMENT_TYPES.has('terrain_contour')).toBe(true);
  });
});

// ── LandscapeProperties shape ─────────────────────────────────────────────────

describe('T-SITE-01: LandscapeProperties interface', () => {
  it('accepts a fully-populated landscape props object', () => {
    const lp: LandscapeProperties = {
      speciesId: 'tree_oak_01',
      libraryId: 'starter',
      variation: 0,
      scale: 1.0,
      rotation: 45,
      maturityStage: 1,
    };
    expect(lp.speciesId).toBe('tree_oak_01');
    expect(lp.maturityStage).toBe(1);
  });

  it('maturityStage is optional', () => {
    const lp: LandscapeProperties = {
      speciesId: 'rock_granite_01',
      libraryId: 'starter',
      variation: 0,
      scale: 1.5,
      rotation: 0,
    };
    expect(lp.maturityStage).toBeUndefined();
  });
});

// ── addElement factory ─────────────────────────────────────────────────────────

describe('T-SITE-01: addElement factory for landscape types', () => {
  function makeDoc() {
    return createProject('proj-1', 'user-1');
  }

  it('creates a planting element with correct type', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'planting', layerId: 'default', levelId: '' });
    expect(doc.content.elements[id].type).toBe('planting');
  });

  it('creates a rock element with correct type', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'rock', layerId: 'default', levelId: '' });
    expect(doc.content.elements[id].type).toBe('rock');
  });

  it('creates a site_furniture element', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'site_furniture', layerId: 'default', levelId: '' });
    expect(doc.content.elements[id].type).toBe('site_furniture');
  });

  it('creates a person element', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'person', layerId: 'default', levelId: '' });
    expect(doc.content.elements[id].type).toBe('person');
  });

  it('creates a vehicle element', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'vehicle', layerId: 'default', levelId: '' });
    expect(doc.content.elements[id].type).toBe('vehicle');
  });

  it('creates a terrain_contour element', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'terrain_contour', layerId: 'default', levelId: '' });
    expect(doc.content.elements[id].type).toBe('terrain_contour');
  });

  it('new landscape element has valid bounding box', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'planting', layerId: 'default', levelId: '' });
    const { boundingBox } = doc.content.elements[id];
    expect(isFinite(boundingBox.min.x)).toBe(true);
    expect(isFinite(boundingBox.max.z)).toBe(true);
  });

  it('element is visible and unlocked by default', () => {
    const doc = makeDoc();
    const id = addElement(doc, { type: 'planting', layerId: 'default', levelId: '' });
    expect(doc.content.elements[id].visible).toBe(true);
    expect(doc.content.elements[id].locked).toBe(false);
  });

  it('accepts landscape properties stored on the element', () => {
    const doc = makeDoc();
    const props = {
      SpeciesId: { type: 'string' as const, value: 'tree_oak_01' },
      LibraryId: { type: 'string' as const, value: 'starter' },
      Scale: { type: 'number' as const, value: 1.0 },
      Rotation: { type: 'number' as const, value: 0 },
      Variation: { type: 'number' as const, value: 0 },
    };
    const id = addElement(doc, { type: 'planting', layerId: 'default', levelId: '', properties: props });
    expect(doc.content.elements[id].properties['SpeciesId'].value).toBe('tree_oak_01');
  });
});

// ── IFC mapping ───────────────────────────────────────────────────────────────

describe('T-SITE-01: IFC entity mapping', () => {
  const adapter = new IFCAdapter();

  it('maps planting to IFCGEOGRAPHICELEMENT', () => {
    expect(adapter.getIFCEntityType('planting')).toBe('IFCGEOGRAPHICELEMENT');
  });

  it('maps rock to IFCGEOGRAPHICELEMENT', () => {
    expect(adapter.getIFCEntityType('rock')).toBe('IFCGEOGRAPHICELEMENT');
  });

  it('maps terrain_contour to IFCGEOGRAPHICELEMENT', () => {
    expect(adapter.getIFCEntityType('terrain_contour')).toBe('IFCGEOGRAPHICELEMENT');
  });

  it('maps site_furniture to IFCFURNISHINGELEMENT', () => {
    expect(adapter.getIFCEntityType('site_furniture')).toBe('IFCFURNISHINGELEMENT');
  });

  it('maps person to IFCBUILDINGELEMENTPROXY', () => {
    expect(adapter.getIFCEntityType('person')).toBe('IFCBUILDINGELEMENTPROXY');
  });

  it('maps vehicle to IFCBUILDINGELEMENTPROXY', () => {
    expect(adapter.getIFCEntityType('vehicle')).toBe('IFCBUILDINGELEMENTPROXY');
  });
});

// ── Persistence round-trip ────────────────────────────────────────────────────

describe('T-SITE-01: persistence round-trip', () => {
  it('serialises and deserialises landscape elements faithfully', () => {
    const doc = createProject('proj-2', 'user-1');
    const id = addElement(doc, {
      type: 'planting',
      layerId: 'default',
      levelId: '',
      properties: {
        SpeciesId: { type: 'string', value: 'tree_oak_01' },
        Scale: { type: 'number', value: 2.5 },
      },
    });

    const serialised = JSON.stringify(doc);
    const reloaded = JSON.parse(serialised);
    expect(reloaded.content.elements[id].type).toBe('planting');
    expect(reloaded.content.elements[id].properties.SpeciesId.value).toBe('tree_oak_01');
    expect(reloaded.content.elements[id].properties.Scale.value).toBe(2.5);
  });
});

// ── Undo/redo smoke test ──────────────────────────────────────────────────────

describe('T-SITE-01: undo/redo smoke test', () => {
  it('addElement is reversible via document snapshot', () => {
    const doc = createProject('proj-3', 'user-1');
    const before = JSON.stringify(doc.content.elements);
    const id = addElement(doc, { type: 'planting', layerId: 'default', levelId: '' });
    expect(Object.keys(doc.content.elements)).toContain(id);

    // Simulate undo by restoring the snapshot (as the store history middleware does)
    doc.content.elements = JSON.parse(before);
    expect(Object.keys(doc.content.elements)).not.toContain(id);
  });
});
