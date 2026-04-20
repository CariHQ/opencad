/**
 * Document Model Core Tests
 * T-DOC-012: computeBoundingBox and addElement operations
 */
import { describe, it, expect } from 'vitest';
import { computeBoundingBox, addElement, createProject } from './document';
import type { PropertyValue } from './types';

function prop(value: number | string): PropertyValue {
  return { type: typeof value === 'number' ? 'number' : 'string', value } as PropertyValue;
}

describe('T-DOC-012: computeBoundingBox — wall/line/beam', () => {
  it('wall bounding box from start/end', () => {
    const bb = computeBoundingBox('wall', {
      StartX: prop(0), StartY: prop(0), EndX: prop(100), EndY: prop(0),
    });
    expect(bb.min.x).toBe(0);
    expect(bb.max.x).toBe(100);
  });

  it('wall bounding box is symmetric with negative values', () => {
    const bb = computeBoundingBox('wall', {
      StartX: prop(-50), StartY: prop(-50), EndX: prop(50), EndY: prop(50),
    });
    expect(bb.min.x).toBe(-50);
    expect(bb.max.x).toBe(50);
  });

  it('line bounding box', () => {
    const bb = computeBoundingBox('line', {
      StartX: prop(10), StartY: prop(10), EndX: prop(20), EndY: prop(10),
    });
    expect(bb.max.x).toBe(20);
  });
});

describe('T-DOC-012: computeBoundingBox — rectangle/slab', () => {
  it('rectangle bounding box from X, Y, Width, Height', () => {
    const bb = computeBoundingBox('rectangle', {
      X: prop(10), Y: prop(20), Width: prop(200), Height: prop(100),
    });
    expect(bb.min.x).toBe(10);
    expect(bb.min.y).toBe(20);
    expect(bb.max.x).toBe(210);
    expect(bb.max.y).toBe(120);
  });

  it('slab bounding box', () => {
    const bb = computeBoundingBox('slab', {
      X: prop(0), Y: prop(0), Width: prop(500), Height: prop(300),
    });
    expect(bb.max.x).toBe(500);
    expect(bb.max.y).toBe(300);
  });
});

describe('T-DOC-012: computeBoundingBox — circle/arc', () => {
  it('circle bounding box from center and radius', () => {
    const bb = computeBoundingBox('circle', {
      CenterX: prop(50), CenterY: prop(50), Radius: prop(25),
    });
    expect(bb.min.x).toBe(25);
    expect(bb.max.x).toBe(75);
    expect(bb.min.y).toBe(25);
    expect(bb.max.y).toBe(75);
  });
});

describe('T-DOC-012: computeBoundingBox — column', () => {
  it('column bounding box from X, Y, Diameter', () => {
    const bb = computeBoundingBox('column', {
      X: prop(100), Y: prop(100), Diameter: prop(400),
    });
    expect(bb.min.x).toBe(-100);
    expect(bb.max.x).toBe(300);
  });
});

describe('T-DOC-012: computeBoundingBox — door/window', () => {
  it('door bounding box: Width spans plan X, Height drives 3D Z', () => {
    const bb = computeBoundingBox('door', {
      X: prop(0), Y: prop(0), Width: prop(900), Height: prop(2100),
    });
    expect(bb.max.x).toBe(900);      // Width along plan-X
    expect(bb.max.z).toBe(2100);     // Height drives vertical extent
    // Plan-Y is deliberately a thin band around the host wall centerline,
    // independent of the 3D Height.
    expect(bb.max.y - bb.min.y).toBeLessThan(500);
  });

  it('window defaults to 1200 wide x 1200 tall when no properties', () => {
    const bb = computeBoundingBox('window', { X: prop(0), Y: prop(0) });
    expect(bb.max.x).toBe(1200);     // default Width
    expect(bb.max.z - bb.min.z).toBe(1200); // default Height in Z
  });
});

describe('T-DOC-012: computeBoundingBox — text', () => {
  it('text bounding box has minimum size', () => {
    const bb = computeBoundingBox('text', { X: prop(10), Y: prop(20) });
    expect(bb.max.x - bb.min.x).toBeGreaterThan(0);
    expect(bb.max.y - bb.min.y).toBeGreaterThan(0);
  });
});

describe('T-DOC-012: computeBoundingBox — minimum size', () => {
  it('zero-length element has minimum 1-unit bounding box', () => {
    const bb = computeBoundingBox('wall', {
      StartX: prop(10), StartY: prop(10), EndX: prop(10), EndY: prop(10),
    });
    expect(bb.max.x - bb.min.x).toBeGreaterThanOrEqual(1);
    expect(bb.max.y - bb.min.y).toBeGreaterThanOrEqual(1);
  });

  it('unknown type gets minimum size box', () => {
    const bb = computeBoundingBox('unknown-type', {});
    expect(bb.max.x - bb.min.x).toBeGreaterThanOrEqual(1);
    expect(bb.max.y - bb.min.y).toBeGreaterThanOrEqual(1);
  });
});

describe('T-DOC-012: addElement', () => {
  it('adds element to document and returns id', () => {
    const doc = createProject('p1', 'u1');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    const id = addElement(doc, { type: 'wall', layerId, levelId });
    expect(id).toBeTruthy();
    expect(doc.content.elements[id]).toBeDefined();
  });

  it('added element has correct type', () => {
    const doc = createProject('p1', 'u1');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    const id = addElement(doc, { type: 'door', layerId, levelId });
    expect(doc.content.elements[id].type).toBe('door');
  });

  it('added element has correct layerId', () => {
    const doc = createProject('p1', 'u1');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    const id = addElement(doc, { type: 'wall', layerId, levelId });
    expect(doc.content.elements[id].layerId).toBe(layerId);
  });

  it('adding multiple elements produces unique ids', () => {
    const doc = createProject('p1', 'u1');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    const id1 = addElement(doc, { type: 'wall', layerId, levelId });
    const id2 = addElement(doc, { type: 'wall', layerId, levelId });
    expect(id1).not.toBe(id2);
  });

  it('added element includes bounding box', () => {
    const doc = createProject('p1', 'u1');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    const id = addElement(doc, { type: 'circle', layerId, levelId, properties: { CenterX: prop(50), CenterY: prop(50), Radius: prop(20) } });
    expect(doc.content.elements[id].boundingBox).toBeDefined();
  });
});

describe('T-DOC-012: isStorageQuotaWarning', () => {
  it('returns true when usage exceeds threshold', async () => {
    const { isStorageQuotaWarning } = await import('./storage');
    expect(isStorageQuotaWarning(85, 100)).toBe(true);
  });

  it('returns false when usage is below threshold', async () => {
    const { isStorageQuotaWarning } = await import('./storage');
    expect(isStorageQuotaWarning(50, 100)).toBe(false);
  });

  it('returns false when quota is 0', async () => {
    const { isStorageQuotaWarning } = await import('./storage');
    expect(isStorageQuotaWarning(100, 0)).toBe(false);
  });

  it('custom threshold works', async () => {
    const { isStorageQuotaWarning } = await import('./storage');
    expect(isStorageQuotaWarning(60, 100, 0.5)).toBe(true);
    expect(isStorageQuotaWarning(40, 100, 0.5)).toBe(false);
  });
});
