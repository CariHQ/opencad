/**
 * T-DOC-031 details tests (GitHub issue #324).
 *
 *   T-DOC-031-001 — creating a detail produces a queryable entry
 *   T-DOC-031-003 — elementsInDetail returns points inside the circular region
 *   T-DOC-031-004 — assignDetailToSheet produces "<N> / <sheetNumber>" label
 */
import { describe, it, expect } from 'vitest';
import {
  detailMarkerLabel, assignDetailToSheet, unassignDetail, elementsInDetail,
  type Detail, type DetailMarker,
} from './details';

describe('T-DOC-031: details', () => {
  it('T-DOC-031-001: detail label returns detail.name when no placement', () => {
    const detail: Detail = {
      id: 'd1', name: 'Wall head detail', sourceViewId: 'v1',
      centre: { x: 0, y: 0 }, radius: 500,
    };
    const marker: DetailMarker = { id: 'm1', detailId: 'd1', position: { x: 0, y: 0 } };
    expect(detailMarkerLabel(marker, { d1: detail }, {})).toBe('Wall head detail');
  });

  it('T-DOC-031-004: detail assigned to A-301 viewport 2 produces "2 / A-301" label', () => {
    let detail: Detail = {
      id: 'd1', name: 'Wall head detail', sourceViewId: 'v1',
      centre: { x: 0, y: 0 }, radius: 500,
    };
    detail = assignDetailToSheet(detail, 'sheet-a301', 2);
    const marker: DetailMarker = { id: 'm1', detailId: 'd1', position: { x: 0, y: 0 } };
    const label = detailMarkerLabel(
      marker,
      { d1: detail },
      { 'sheet-a301': { sheetNumber: 'A-301' } },
    );
    expect(label).toBe('2 / A-301');
  });

  it('T-DOC-031-003: elementsInDetail returns only elements inside the region', () => {
    const detail: Detail = {
      id: 'd', name: 'foo', sourceViewId: 'v',
      centre: { x: 100, y: 100 }, radius: 50,
    };
    const inside = elementsInDetail(detail, [
      { id: 'a', x: 100, y: 100 },  // centre
      { id: 'b', x: 130, y: 130 },  // within radius (dist ≈ 42)
      { id: 'c', x: 200, y: 200 },  // outside
    ]);
    expect(inside).toEqual(['a', 'b']);
  });

  it('unassignDetail removes the placement field', () => {
    const assigned = assignDetailToSheet(
      { id: 'd', name: 'x', sourceViewId: 'v', centre: { x: 0, y: 0 }, radius: 10 },
      's', 3,
    );
    expect(assigned.placement).toBeDefined();
    const unassigned = unassignDetail(assigned);
    expect(unassigned.placement).toBeUndefined();
  });

  it('label returns em-dash when detail id is unknown', () => {
    const marker: DetailMarker = { id: 'm', detailId: 'missing', position: { x: 0, y: 0 } };
    expect(detailMarkerLabel(marker, {}, {})).toBe('—');
  });

  it('label returns "N / ?" when detail is placed on a deleted sheet', () => {
    const detail: Detail = {
      id: 'd', name: 'x', sourceViewId: 'v',
      centre: { x: 0, y: 0 }, radius: 10,
      placement: { sheetId: 'ghost', viewportNumber: 4 },
    };
    const marker: DetailMarker = { id: 'm', detailId: 'd', position: { x: 0, y: 0 } };
    expect(detailMarkerLabel(marker, { d: detail }, {})).toBe('4 / ?');
  });
});
