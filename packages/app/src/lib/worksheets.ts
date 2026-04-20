/**
 * Worksheets — T-DOC-032 (#325).
 *
 * A worksheet is a 2D drawing canvas for non-model content: finish
 * legends, general notes pages, site sketches, symbol keys. Elements
 * placed in a worksheet carry its worksheetId and are filtered out of
 * plan/section/elevation queries.
 */

export interface Worksheet {
  id: string;
  name: string;
  /** Optional scale for printed output; null = no-scale worksheet. */
  scale?: string;
  /** Optional note about intended use. */
  description?: string;
}

/** Predicate: does this worksheet id represent a real document worksheet? */
export function isWorksheetId(id: string): boolean {
  return id.startsWith('ws-');
}

/** Build a new worksheet record with a stable id. */
let __wsSeq = 0;
export function createWorksheet(name: string, opts?: Partial<Worksheet>): Worksheet {
  __wsSeq += 1;
  const id = `ws-${Date.now().toString(36)}-${__wsSeq}`;
  return { id, name, ...opts };
}

/** Filter element list for a specific worksheet (or exclude worksheet
 *  elements entirely when id === null). */
export function filterByWorksheet<T extends { properties?: Record<string, { value: unknown }> }>(
  elements: T[],
  worksheetId: string | null,
): T[] {
  if (worksheetId === null) {
    return elements.filter((e) => {
      const v = e.properties?.['WorksheetId']?.value;
      return !(typeof v === 'string' && isWorksheetId(v));
    });
  }
  return elements.filter((e) => {
    const v = e.properties?.['WorksheetId']?.value;
    return typeof v === 'string' && v === worksheetId;
  });
}
