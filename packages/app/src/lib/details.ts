/**
 * Detail drawings + cross-referenced markers — T-DOC-031 (#324) and
 * T-DOC-036 (#329, Drawing Manager) overlap here.
 *
 * A Detail is a zoomed-in, annotated region of a source view. A
 * DetailMarker on a plan points at that region; once the detail lands
 * on a layout sheet as a viewport, the marker label becomes
 * "<viewportNumber> / <sheetNumber>" (e.g. "2 / A-301"). This module
 * is the pure data + label resolver; the UI renders + positions it.
 */

import type { Point2D } from '../utils/roomDetection';

export interface Detail {
  id: string;
  name: string;
  /** View id this detail is a zoomed region of (plan, section, elevation). */
  sourceViewId: string;
  /** Centre of the detail region in world mm. */
  centre: Point2D;
  /** Radius in world mm — region boundary for the zoom. */
  radius: number;
  /** Sheet + viewport assignment once the detail lands on a layout. */
  placement?: { sheetId: string; viewportNumber: number };
}

export interface DetailMarker {
  id: string;
  detailId: string;
  /** Where the marker sits on its source view (world mm). */
  position: Point2D;
}

/** Compute the display label a marker should show. */
export function detailMarkerLabel(
  marker: DetailMarker,
  details: Record<string, Detail>,
  sheets: Record<string, { sheetNumber: string }>,
): string {
  const detail = details[marker.detailId];
  if (!detail) return '—';
  if (!detail.placement) return detail.name;
  const sheet = sheets[detail.placement.sheetId];
  if (!sheet) return `${detail.placement.viewportNumber} / ?`;
  return `${detail.placement.viewportNumber} / ${sheet.sheetNumber}`;
}

/** Move a detail's placement between sheets; returns new placement. */
export function assignDetailToSheet(
  detail: Detail, sheetId: string, viewportNumber: number,
): Detail {
  return { ...detail, placement: { sheetId, viewportNumber } };
}

/** Clear placement when a detail is removed from a sheet. */
export function unassignDetail(detail: Detail): Detail {
  const { placement: _unused, ...rest } = detail;
  return rest;
}

/**
 * Determine which elements of a source view fall inside a detail's
 * region, given a point-in-region test. v1: circular region; points
 * whose distance from `detail.centre` is ≤ radius are included.
 */
export function elementsInDetail(
  detail: Detail,
  elementPositions: Array<{ id: string; x: number; y: number }>,
): string[] {
  const r2 = detail.radius * detail.radius;
  return elementPositions
    .filter((p) => {
      const dx = p.x - detail.centre.x, dy = p.y - detail.centre.y;
      return dx * dx + dy * dy <= r2;
    })
    .map((p) => p.id);
}
