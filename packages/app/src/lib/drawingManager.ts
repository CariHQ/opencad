/**
 * Drawing Manager — sheet numbering + cross-references (T-DOC-036, #329).
 *
 * Layouts get category-scoped auto-numbers (A-101, A-201, A-301, …).
 * Section / elevation / detail markers on plans resolve to
 * "<viewportNumber> / <sheetNumber>" by looking up where the view
 * was placed. Sheet moves → markers reflow automatically.
 */

export type DrawingCategory =
  | 'plan' | 'section' | 'elevation' | 'detail' | 'schedule' | '3d' | 'worksheet' | 'rendering';

/** Prefix conventions. Matches the construction-document drawing-list
 *  pattern common to most firms. */
const PREFIX: Record<DrawingCategory, string> = {
  plan:      'A-1',
  section:   'A-3',
  elevation: 'A-2',
  detail:    'A-5',
  schedule:  'A-6',
  '3d':      'A-7',
  worksheet: 'A-9',
  rendering: 'A-8',
};

export interface Sheet {
  id: string;
  sheetNumber: string;
  category: DrawingCategory;
  name: string;
}

export interface ViewportPlacement {
  /** id of the Detail / section / elevation / schedule view placed on a sheet. */
  viewId: string;
  sheetId: string;
  /** 1-indexed order within the sheet. */
  viewportNumber: number;
}

export interface DrawingIndex {
  sheets: Record<string, Sheet>;
  placements: Record<string, ViewportPlacement>; // keyed by viewId
}

/** Generate the next sheet number for a category. Looks at existing sheets
 *  and returns the lowest unused number ≥ the category's starting range. */
export function nextSheetNumber(
  category: DrawingCategory,
  existing: Sheet[],
): string {
  const prefix = PREFIX[category];
  const usedSuffixes = new Set<number>();
  for (const s of existing) {
    if (s.sheetNumber.startsWith(prefix)) {
      const suffix = parseInt(s.sheetNumber.slice(prefix.length), 10);
      if (!isNaN(suffix)) usedSuffixes.add(suffix);
    }
  }
  // Start from 01 for plans (A-101), 01 for sections (A-301), etc.
  let n = 1;
  while (usedSuffixes.has(n)) n++;
  return `${prefix}${n.toString().padStart(2, '0')}`;
}

/** Resolve a view's display reference — "<viewportNumber> / <sheetNumber>"
 *  or empty string when the view hasn't been placed. */
export function resolveViewReference(
  viewId: string,
  index: DrawingIndex,
): string {
  const p = index.placements[viewId];
  if (!p) return '';
  const sheet = index.sheets[p.sheetId];
  if (!sheet) return `${p.viewportNumber} / ?`;
  return `${p.viewportNumber} / ${sheet.sheetNumber}`;
}

/** Place a view on a sheet. Returns the updated index. */
export function placeOnSheet(
  index: DrawingIndex,
  viewId: string,
  sheetId: string,
  viewportNumber?: number,
): DrawingIndex {
  // If no explicit number, use the next available viewport number on that sheet.
  const used = Object.values(index.placements)
    .filter((p) => p.sheetId === sheetId)
    .map((p) => p.viewportNumber);
  const nextVpn = viewportNumber ?? (used.length === 0 ? 1 : Math.max(...used) + 1);
  return {
    ...index,
    placements: { ...index.placements, [viewId]: { viewId, sheetId, viewportNumber: nextVpn } },
  };
}

/** Remove a placement. */
export function removePlacement(index: DrawingIndex, viewId: string): DrawingIndex {
  if (!index.placements[viewId]) return index;
  const next = { ...index.placements };
  delete next[viewId];
  return { ...index, placements: next };
}

/** Find placements that reference a deleted sheet; clear them. */
export function pruneDeadPlacements(index: DrawingIndex): DrawingIndex {
  const cleanPlacements: Record<string, ViewportPlacement> = {};
  for (const [vid, p] of Object.entries(index.placements)) {
    if (index.sheets[p.sheetId]) cleanPlacements[vid] = p;
  }
  return { ...index, placements: cleanPlacements };
}
