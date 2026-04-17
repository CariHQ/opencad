/**
 * Layer Operations Tests
 * T-DOC-008: Layer CRUD operations
 */
import { describe, it, expect } from 'vitest';
import {
  createLayer,
  updateLayerColor,
  updateLayerVisibility,
  updateLayerLock,
  reorderLayers,
} from './layer';
import type { LayerSchema } from './types';

function makeLayer(overrides: Partial<{ name: string; color: string }> = {}): LayerSchema {
  return createLayer({ name: overrides.name || 'Layer 1', color: overrides.color || '#ff0000' });
}

describe('T-DOC-008: createLayer', () => {
  it('creates a layer with the given name', () => {
    const layer = createLayer({ name: 'Walls', color: '#ff0000' });
    expect(layer.name).toBe('Walls');
  });

  it('creates a layer with the given color', () => {
    const layer = createLayer({ name: 'Walls', color: '#00ff00' });
    expect(layer.color).toBe('#00ff00');
  });

  it('generates a unique id', () => {
    const l1 = makeLayer();
    const l2 = makeLayer();
    expect(l1.id).not.toBe(l2.id);
  });

  it('defaults visible to true', () => {
    expect(makeLayer().visible).toBe(true);
  });

  it('defaults locked to false', () => {
    expect(makeLayer().locked).toBe(false);
  });

  it('defaults order to 0', () => {
    expect(makeLayer().order).toBe(0);
  });

  it('accepts custom visible, locked, order', () => {
    const layer = createLayer({ name: 'L', color: '#000', visible: false, locked: true, order: 5 });
    expect(layer.visible).toBe(false);
    expect(layer.locked).toBe(true);
    expect(layer.order).toBe(5);
  });
});

describe('T-DOC-008: updateLayerColor', () => {
  it('updates color', () => {
    const layer = makeLayer();
    const updated = updateLayerColor(layer, '#0000ff');
    expect(updated.color).toBe('#0000ff');
  });

  it('does not mutate original', () => {
    const layer = makeLayer({ color: '#ff0000' });
    updateLayerColor(layer, '#0000ff');
    expect(layer.color).toBe('#ff0000');
  });
});

describe('T-DOC-008: updateLayerVisibility', () => {
  it('sets visibility to false', () => {
    const layer = makeLayer();
    const updated = updateLayerVisibility(layer, false);
    expect(updated.visible).toBe(false);
  });

  it('sets visibility to true', () => {
    const layer = { ...makeLayer(), visible: false };
    const updated = updateLayerVisibility(layer, true);
    expect(updated.visible).toBe(true);
  });
});

describe('T-DOC-008: updateLayerLock', () => {
  it('locks the layer', () => {
    const layer = makeLayer();
    const updated = updateLayerLock(layer, true);
    expect(updated.locked).toBe(true);
  });

  it('unlocks the layer', () => {
    const layer = { ...makeLayer(), locked: true };
    const updated = updateLayerLock(layer, false);
    expect(updated.locked).toBe(false);
  });
});

describe('T-DOC-008: reorderLayers', () => {
  it('reorders layers by given id order', () => {
    const l1 = createLayer({ name: 'A', color: '#f00' });
    const l2 = createLayer({ name: 'B', color: '#0f0' });
    const l3 = createLayer({ name: 'C', color: '#00f' });

    const layers = { [l1.id]: l1, [l2.id]: l2, [l3.id]: l3 };
    const reordered = reorderLayers(layers, [l3.id, l1.id, l2.id]);

    expect(reordered[l3.id].order).toBe(0);
    expect(reordered[l1.id].order).toBe(1);
    expect(reordered[l2.id].order).toBe(2);
  });

  it('ignores ids not in the layers record', () => {
    const l1 = createLayer({ name: 'A', color: '#f00' });
    const layers = { [l1.id]: l1 };
    const reordered = reorderLayers(layers, [l1.id, 'non-existent']);
    expect(reordered['non-existent']).toBeUndefined();
  });

  it('does not mutate original layers', () => {
    const l1 = createLayer({ name: 'A', color: '#f00' });
    const layers = { [l1.id]: l1 };
    reorderLayers(layers, [l1.id]);
    expect(layers[l1.id].order).toBe(0);
  });
});
