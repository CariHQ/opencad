/**
 * T-DOC-035 zone stamp tests (GitHub issue #328).
 *
 *   T-DOC-035-001 — rectangular zone area = width × height (m²)
 *   T-DOC-035-005 — RoomStamp renders at polygon centroid
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import { buildZoneStamp, buildAllStamps } from './zoneStamp';

let __id = 0;
function mkZone(props: Record<string, string | number>): ElementSchema {
  const propObj: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    propObj[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  }
  return {
    id: `z-${++__id}`, type: 'space', layerId: 'l1',
    properties: propObj,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-DOC-035: zoneStamp', () => {
  it('T-DOC-035-001: 5 × 4 m rectangle area = 20 m²', () => {
    const zone = mkZone({
      Name: 'Living',
      Points: JSON.stringify([
        { x: 0, y: 0 }, { x: 5000, y: 0 },
        { x: 5000, y: 4000 }, { x: 0, y: 4000 },
      ]),
    });
    const stamp = buildZoneStamp(zone);
    expect(stamp!.areaM2).toBeCloseTo(20, 3);
  });

  it('handles counter-clockwise winding (area positive)', () => {
    const zone = mkZone({
      Points: JSON.stringify([
        { x: 0, y: 4000 }, { x: 5000, y: 4000 },
        { x: 5000, y: 0 }, { x: 0, y: 0 },
      ]),
    });
    const stamp = buildZoneStamp(zone);
    expect(stamp!.areaM2).toBeGreaterThan(0);
  });

  it('T-DOC-035-005: room stamp lives at the polygon centroid', () => {
    const zone = mkZone({
      Name: 'Living',
      Points: JSON.stringify([
        { x: 0, y: 0 }, { x: 4000, y: 0 },
        { x: 4000, y: 4000 }, { x: 0, y: 4000 },
      ]),
    });
    const stamp = buildZoneStamp(zone);
    expect(stamp!.centroid.x).toBeCloseTo(2000, 0);
    expect(stamp!.centroid.y).toBeCloseTo(2000, 0);
  });

  it('stamp lines contain configured fields and skip empty values', () => {
    const zone = mkZone({
      Name: 'Bedroom',
      Points: JSON.stringify([
        { x: 0, y: 0 }, { x: 3000, y: 0 },
        { x: 3000, y: 3000 }, { x: 0, y: 3000 },
      ]),
    });
    const stamp = buildZoneStamp(zone, ['tag', 'name', 'area']);
    // No tag was set → tag omitted, name + area included
    expect(stamp!.lines).toHaveLength(2);
    expect(stamp!.lines[0]).toBe('Bedroom');
    expect(stamp!.lines[1]).toBe('9.0 m²');
  });

  it('returns null when polygon is missing', () => {
    const zone = mkZone({ Name: 'Bad' });
    expect(buildZoneStamp(zone)).toBeNull();
  });

  it('buildAllStamps only returns stamps for "space" elements', () => {
    const zone = mkZone({
      Name: 'Living',
      Points: JSON.stringify([
        { x: 0, y: 0 }, { x: 5000, y: 0 },
        { x: 5000, y: 4000 }, { x: 0, y: 4000 },
      ]),
    });
    const wall: ElementSchema = {
      ...zone, id: 'w-1', type: 'wall',
    } as ElementSchema;
    const elements: Record<string, ElementSchema> = { [zone.id]: zone, [wall.id]: wall };
    const stamps = buildAllStamps(elements);
    expect(stamps).toHaveLength(1);
    expect(stamps[0]!.elementId).toBe(zone.id);
  });

  it('buildAllStamps falls back to legacy Area property when Points is absent', () => {
    const zone = mkZone({ Name: 'Kitchen', Area: 12.5 });
    const stamps = buildAllStamps({ [zone.id]: zone });
    expect(stamps).toHaveLength(1);
    expect(stamps[0]!.areaM2).toBe(12.5);
  });
});
