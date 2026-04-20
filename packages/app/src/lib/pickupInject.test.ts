/**
 * T-MOD-025 pickup/inject tests (GitHub issue #318).
 *
 *   T-MOD-025-001 — pickup on wall returns relevant keys only
 *   T-MOD-025-002 — inject on same-type element produces patch
 *   T-MOD-025-003 — cross-type inject is a no-op (returns null)
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import { pickup, inject, describeHeld } from './pickupInject';

function mk(type: ElementSchema['type'], props: Record<string, number | string>): ElementSchema {
  const propObj: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    propObj[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  }
  return {
    id: 'e', type, layerId: 'l',
    properties: propObj,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-MOD-025: pickup/inject', () => {
  it('T-MOD-025-001: pickup on a wall captures WallType, Width, Material', () => {
    const w = mk('wall', { Width: 300, Material: 'Concrete', WallType: 'exterior', RandomExtra: 'x' });
    const held = pickup(w);
    expect(held).not.toBeNull();
    expect(held!.type).toBe('wall');
    expect(held!.params.Width).toBe(300);
    expect(held!.params.Material).toBe('Concrete');
    expect(held!.params.WallType).toBe('exterior');
    // Extra keys outside the allowlist are dropped
    expect(held!.params.RandomExtra).toBeUndefined();
  });

  it('T-MOD-025-002: inject on another wall produces a patch', () => {
    const src = mk('wall', { Width: 300, Material: 'Concrete', WallType: 'exterior' });
    const dst = mk('wall', { Width: 150, Material: 'Plasterboard', WallType: 'interior' });
    const held = pickup(src)!;
    const patch = inject(dst, held);
    expect(patch).not.toBeNull();
    expect(patch!.Width?.value).toBe(300);
    expect(patch!.Material?.value).toBe('Concrete');
  });

  it('T-MOD-025-003: cross-type inject returns null', () => {
    const wall = mk('wall',  { Width: 300, Material: 'Concrete' });
    const slab = mk('slab',  { Thickness: 200, Material: 'Concrete' });
    const held = pickup(wall)!;
    expect(inject(slab, held)).toBeNull();
  });

  it('pickup on unsupported element type returns null', () => {
    const a = mk('annotation', { X: 0, Y: 0 });
    expect(pickup(a)).toBeNull();
  });

  it('describeHeld produces a human summary', () => {
    const w = mk('wall', { Width: 300, Material: 'Concrete', WallType: 'exterior' });
    const held = pickup(w)!;
    expect(describeHeld(held)).toBe('Wall 300 mm Concrete exterior');
  });
});
