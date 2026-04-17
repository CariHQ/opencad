/**
 * Element Operations Tests
 * T-DOC-007: Element CRUD operations
 */
import { describe, it, expect } from 'vitest';
import {
  createElement,
  updateElementTransform,
  updateElementProperty,
  updateElementBoundingBox,
  setElementVisibility,
  setElementLocked,
  moveElementToLayer,
  moveElementToLevel,
  getElementVolume,
  getElementCenter,
} from './element';
import type { BoundingBox3D } from './types';

function makeElement() {
  return createElement({
    id: 'el-1',
    type: 'wall',
    layerId: 'layer-1',
  });
}

describe('T-DOC-007: createElement', () => {
  it('creates element with correct id', () => {
    const el = createElement({ id: 'el-test', type: 'wall', layerId: 'l1' });
    expect(el.id).toBe('el-test');
  });

  it('creates element with correct type', () => {
    const el = createElement({ id: 'el-1', type: 'door', layerId: 'l1' });
    expect(el.type).toBe('door');
  });

  it('creates element with correct layerId', () => {
    const el = createElement({ id: 'el-1', type: 'wall', layerId: 'my-layer' });
    expect(el.layerId).toBe('my-layer');
  });

  it('defaults levelId to null', () => {
    const el = makeElement();
    expect(el.levelId).toBeNull();
  });

  it('accepts optional levelId', () => {
    const el = createElement({ id: 'el-1', type: 'wall', layerId: 'l1', levelId: 'level-2' });
    expect(el.levelId).toBe('level-2');
  });

  it('defaults visible to true', () => {
    expect(makeElement().visible).toBe(true);
  });

  it('defaults locked to false', () => {
    expect(makeElement().locked).toBe(false);
  });

  it('defaults scale to 1,1,1', () => {
    const el = makeElement();
    expect(el.transform.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('defaults translation to 0,0,0', () => {
    const el = makeElement();
    expect(el.transform.translation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('accepts custom properties', () => {
    const el = createElement({ id: 'el-1', type: 'wall', layerId: 'l1', properties: { Width: { type: 'number', value: 200 } } });
    expect((el.properties['Width'] as { value: number }).value).toBe(200);
  });

  it('creates empty propertySets by default', () => {
    expect(makeElement().propertySets).toEqual([]);
  });

  it('metadata has positive createdAt', () => {
    expect(makeElement().metadata.createdAt).toBeGreaterThan(0);
  });
});

describe('T-DOC-007: updateElementTransform', () => {
  it('updates translation', () => {
    const el = makeElement();
    const updated = updateElementTransform(el, { translation: { x: 10, y: 5, z: 0 } });
    expect(updated.transform.translation).toEqual({ x: 10, y: 5, z: 0 });
  });

  it('updates rotation', () => {
    const el = makeElement();
    const updated = updateElementTransform(el, { rotation: { x: 0, y: 90, z: 0 } });
    expect(updated.transform.rotation).toEqual({ x: 0, y: 90, z: 0 });
  });

  it('does not mutate original element', () => {
    const el = makeElement();
    updateElementTransform(el, { translation: { x: 100, y: 0, z: 0 } });
    expect(el.transform.translation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('preserves other fields', () => {
    const el = makeElement();
    const updated = updateElementTransform(el, { translation: { x: 1, y: 0, z: 0 } });
    expect(updated.id).toBe('el-1');
    expect(updated.type).toBe('wall');
  });
});

describe('T-DOC-007: updateElementProperty', () => {
  it('adds a new property', () => {
    const el = makeElement();
    const updated = updateElementProperty(el, 'Height', { type: 'number', value: 3000 });
    expect((updated.properties['Height'] as { value: number }).value).toBe(3000);
  });

  it('overwrites existing property', () => {
    const el = createElement({ id: 'el-1', type: 'wall', layerId: 'l1', properties: { Width: { type: 'number', value: 200 } } });
    const updated = updateElementProperty(el, 'Width', { type: 'number', value: 300 });
    expect((updated.properties['Width'] as { value: number }).value).toBe(300);
  });

  it('does not mutate original', () => {
    const el = makeElement();
    updateElementProperty(el, 'X', { type: 'number', value: 1 });
    expect(el.properties['X']).toBeUndefined();
  });
});

describe('T-DOC-007: updateElementBoundingBox', () => {
  it('updates the bounding box', () => {
    const el = makeElement();
    const bb: BoundingBox3D = {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      max: { x: 5, y: 3, z: 0.2, _type: 'Point3D' },
    };
    const updated = updateElementBoundingBox(el, bb);
    expect(updated.boundingBox.max.x).toBe(5);
  });
});

describe('T-DOC-007: setElementVisibility', () => {
  it('sets visibility to false', () => {
    const el = makeElement();
    const updated = setElementVisibility(el, false);
    expect(updated.visible).toBe(false);
  });

  it('sets visibility to true', () => {
    const el = { ...makeElement(), visible: false };
    const updated = setElementVisibility(el, true);
    expect(updated.visible).toBe(true);
  });
});

describe('T-DOC-007: setElementLocked', () => {
  it('locks the element', () => {
    const el = makeElement();
    const updated = setElementLocked(el, true);
    expect(updated.locked).toBe(true);
  });

  it('unlocks the element', () => {
    const el = { ...makeElement(), locked: true };
    const updated = setElementLocked(el, false);
    expect(updated.locked).toBe(false);
  });
});

describe('T-DOC-007: moveElementToLayer', () => {
  it('moves element to new layer', () => {
    const el = makeElement();
    const updated = moveElementToLayer(el, 'layer-2');
    expect(updated.layerId).toBe('layer-2');
  });

  it('does not mutate original', () => {
    const el = makeElement();
    moveElementToLayer(el, 'layer-new');
    expect(el.layerId).toBe('layer-1');
  });
});

describe('T-DOC-007: moveElementToLevel', () => {
  it('moves element to new level', () => {
    const el = makeElement();
    const updated = moveElementToLevel(el, 'level-2');
    expect(updated.levelId).toBe('level-2');
  });

  it('can set level to null', () => {
    const el = createElement({ id: 'el-1', type: 'wall', layerId: 'l1', levelId: 'level-1' });
    const updated = moveElementToLevel(el, null);
    expect(updated.levelId).toBeNull();
  });
});

describe('T-DOC-007: getElementVolume', () => {
  it('computes volume from bounding box', () => {
    const el = makeElement();
    const bb: BoundingBox3D = {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      max: { x: 5, y: 3, z: 0.2, _type: 'Point3D' },
    };
    const updated = updateElementBoundingBox(el, bb);
    expect(getElementVolume(updated)).toBeCloseTo(5 * 3 * 0.2, 5);
  });

  it('returns 0 for zero-size bounding box', () => {
    expect(getElementVolume(makeElement())).toBe(0);
  });
});

describe('T-DOC-007: getElementCenter', () => {
  it('returns center of bounding box', () => {
    const el = makeElement();
    const bb: BoundingBox3D = {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      max: { x: 4, y: 6, z: 2, _type: 'Point3D' },
    };
    const updated = updateElementBoundingBox(el, bb);
    const center = getElementCenter(updated);
    expect(center.x).toBeCloseTo(2, 5);
    expect(center.y).toBeCloseTo(3, 5);
    expect(center.z).toBeCloseTo(1, 5);
  });
});
