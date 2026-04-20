/**
 * T-DOC-007 schedule tests (GitHub issue #300).
 *
 *   T-DOC-007-001 — empty doc produces []
 *   T-DOC-007-002 — 3 doors produce 3 rows with tags D-001, D-002, D-003
 *   T-DOC-007-004 — door row carries Material column from the element
 *   T-DOC-007-005 — room schedule uses space elements
 */
import { describe, it, expect } from 'vitest';
import type { DocumentSchema, ElementSchema } from '@opencad/document';
import { doorSchedule, windowSchedule, roomSchedule, scheduleToCSV } from './schedules';

let __id = 0;
function mkEl(type: ElementSchema['type'], props: Record<string, number | string>): ElementSchema {
  const propObj: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    propObj[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  }
  return {
    id: `e-${++__id}`, type, layerId: 'l1',
    properties: propObj,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

function mkDoc(els: ElementSchema[]): DocumentSchema {
  const elements: Record<string, ElementSchema> = {};
  for (const e of els) elements[e.id] = e;
  return {
    id: 'doc', name: 't', version: { clock: {} },
    metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u1', schemaVersion: '1' },
    content: { elements, spaces: {} },
    organization: { layers: {}, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  } as DocumentSchema;
}

describe('T-DOC-007: schedules', () => {
  it('T-DOC-007-001: empty doc produces []', () => {
    expect(doorSchedule(mkDoc([]))).toEqual([]);
    expect(windowSchedule(mkDoc([]))).toEqual([]);
    expect(roomSchedule(mkDoc([]))).toEqual([]);
  });

  it('T-DOC-007-002: 3 doors produce 3 rows with tags D-001, D-002, D-003', () => {
    const ds = [
      mkEl('door', { Width: 900, Height: 2100 }),
      mkEl('door', { Width: 900, Height: 2100 }),
      mkEl('door', { Width: 900, Height: 2100 }),
    ];
    const rows = doorSchedule(mkDoc(ds));
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.tag)).toEqual(['D-001', 'D-002', 'D-003']);
  });

  it('explicit Tag on an element is preserved over auto-gen', () => {
    const ds = [
      mkEl('door', { Tag: 'D-007', Width: 900, Height: 2100 }),
      mkEl('door', { Width: 900, Height: 2100 }),
    ];
    const rows = doorSchedule(mkDoc(ds));
    expect(rows.find((r) => r.elementId === ds[0]!.id)!.tag).toBe('D-007');
    // Second door gets D-001 (lowest unused)
    expect(rows.find((r) => r.elementId === ds[1]!.id)!.tag).toBe('D-001');
  });

  it('T-DOC-007-004: door row carries Material column from the element', () => {
    const d = mkEl('door', { Width: 900, Height: 2100, Material: 'Oak' });
    const rows = doorSchedule(mkDoc([d]));
    expect(rows[0]!.material).toBe('Oak');
  });

  it('window schedule picks up sill height', () => {
    const w = mkEl('window', { Width: 1200, Height: 1200, SillHeight: 900 });
    const rows = windowSchedule(mkDoc([w]));
    expect(rows[0]!.sill).toBe(900);
  });

  it('T-DOC-007-005: roomSchedule uses space elements', () => {
    const s1 = mkEl('space', { Name: 'Living', Area: 22.5 });
    const s2 = mkEl('space', { Name: 'Kitchen', Area: 15.5 });
    const rows = roomSchedule(mkDoc([s1, s2]));
    expect(rows).toHaveLength(2);
    expect(rows[0]!.name).toBe('Living');
    expect(rows[0]!.area).toBe(22.5);
  });

  it('scheduleToCSV produces header + escaped values', () => {
    const rows = doorSchedule(mkDoc([
      mkEl('door', { Width: 900, Height: 2100, Material: 'Oak, Quarter-sawn' }),
    ]));
    const csv = scheduleToCSV(rows);
    expect(csv.split('\n')[0]).toContain('tag');
    expect(csv).toContain('"Oak, Quarter-sawn"');
  });

  it('scheduleToCSV on empty input returns empty string', () => {
    expect(scheduleToCSV([])).toBe('');
  });
});
