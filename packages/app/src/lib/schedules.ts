/**
 * Interactive schedules — T-DOC-007 (#300).
 *
 * Pure generators that take a DocumentSchema and return the rows for
 * door, window, and room schedules. Tags auto-generate per type with a
 * stable-per-id policy (each element carries its tag on first
 * encounter; if removed, the tag is freed but not re-issued until the
 * sequence wraps back around).
 */

import type { DocumentSchema, ElementSchema } from '@opencad/document';

export interface ScheduleRow {
  elementId: string;
  tag: string;
  [column: string]: string | number;
}

export interface DoorScheduleRow extends ScheduleRow {
  tag: string;
  width: number;
  height: number;
  material: string;
  hostWall: string;
  level: string;
  cost: number;
}

export interface WindowScheduleRow extends ScheduleRow {
  tag: string;
  width: number;
  height: number;
  sill: number;
  material: string;
  hostWall: string;
  level: string;
  cost: number;
}

export interface RoomScheduleRow extends ScheduleRow {
  tag: string;
  name: string;
  area: number;            // m²
  occupancy: string;
  finishFloor: string;
  finishWalls: string;
  finishCeiling: string;
}

function numProp(el: ElementSchema, key: string, fb = 0): number {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'number' ? (p.value as number) : fb;
}
function strProp(el: ElementSchema, key: string, fb = ''): string {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'string' ? (p.value as string) : fb;
}

/**
 * Assign deterministic tags (D-001, W-001, R-101, ...) to a set of
 * elements, in insertion order. Uses any pre-existing `Tag` property.
 * Produces new tags for ones without.
 */
function assignTags(
  elements: ElementSchema[],
  prefix: string,
  startFrom: number = 1,
): Array<{ el: ElementSchema; tag: string }> {
  const used = new Set<string>();
  const withTags: Array<{ el: ElementSchema; tag: string }> = [];
  // Pass 1: carry explicit tags
  for (const el of elements) {
    const explicit = strProp(el, 'Tag', '');
    if (explicit) { used.add(explicit); withTags.push({ el, tag: explicit }); }
  }
  // Pass 2: generate for untagged elements
  let seq = startFrom;
  for (const el of elements) {
    if (withTags.find((x) => x.el.id === el.id)) continue;
    let candidate: string;
    do {
      candidate = `${prefix}-${seq.toString().padStart(3, '0')}`;
      seq++;
    } while (used.has(candidate));
    used.add(candidate);
    withTags.push({ el, tag: candidate });
  }
  return withTags;
}

export function doorSchedule(doc: DocumentSchema): DoorScheduleRow[] {
  const doors = Object.values(doc.content.elements).filter((e) => e.type === 'door');
  const withTags = assignTags(doors, 'D');
  return withTags.map(({ el, tag }) => ({
    elementId: el.id,
    tag,
    width:  numProp(el, 'Width',  900),
    height: numProp(el, 'Height', 2100),
    material: strProp(el, 'Material', ''),
    hostWall: strProp(el, 'HostWallId', ''),
    level: el.levelId ?? '',
    cost: numProp(el, 'Cost', 0),
  }));
}

export function windowSchedule(doc: DocumentSchema): WindowScheduleRow[] {
  const windows = Object.values(doc.content.elements).filter((e) => e.type === 'window');
  const withTags = assignTags(windows, 'W');
  return withTags.map(({ el, tag }) => ({
    elementId: el.id,
    tag,
    width:  numProp(el, 'Width',      1200),
    height: numProp(el, 'Height',     1200),
    sill:   numProp(el, 'SillHeight',  900),
    material: strProp(el, 'Material', ''),
    hostWall: strProp(el, 'HostWallId', ''),
    level: el.levelId ?? '',
    cost: numProp(el, 'Cost', 0),
  }));
}

export function roomSchedule(doc: DocumentSchema): RoomScheduleRow[] {
  // Treat every "space" element as a room. Per-level numbering picks up
  // the floor number from levelId (or falls back to 1) to produce the
  // classic "first-floor rooms start at 101" numbering pattern.
  const spaces = Object.values(doc.content.elements).filter((e) => e.type === 'space');
  const levels = Object.values(doc.organization.levels).sort((a, b) => a.elevation - b.elevation);
  const levelOrder = new Map<string, number>(levels.map((l, i) => [l.id, i + 1]));

  const out: RoomScheduleRow[] = [];
  // Group by level → number
  const byLevel = new Map<string, ElementSchema[]>();
  for (const s of spaces) {
    const key = s.levelId ?? '';
    if (!byLevel.has(key)) byLevel.set(key, []);
    byLevel.get(key)!.push(s);
  }
  for (const [lvlId, spacesOnLvl] of byLevel.entries()) {
    const floorNum = levelOrder.get(lvlId) ?? 1;
    const withTags = assignTags(spacesOnLvl, `${floorNum}0`, 1);
    for (const { el, tag } of withTags) {
      out.push({
        elementId: el.id,
        tag,
        name: strProp(el, 'Name', '(room)'),
        area: numProp(el, 'Area', 0),
        occupancy: strProp(el, 'OccupancyType', ''),
        finishFloor:   strProp(el, 'FinishFloor', ''),
        finishWalls:   strProp(el, 'FinishWalls', ''),
        finishCeiling: strProp(el, 'FinishCeiling', ''),
      });
    }
  }
  return out;
}

/** Serialise any schedule to CSV (RFC-4180 quoted). */
export function scheduleToCSV(rows: ScheduleRow[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]!);
  const escape = (v: unknown): string => {
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.map(escape).join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c] ?? '')).join(',')).join('\n');
  return `${header}\n${body}`;
}
