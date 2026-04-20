/**
 * Title block renderer — T-DOC-008 (#301).
 *
 * A layout sheet carries a title block at the bottom (or right) that shows
 * project name, client, sheet title, sheet number, date, drawn-by,
 * revision. Title blocks are just SVG templates with {{tokens}} — this
 * module renders tokens against a LayoutContext so the same template
 * can power any sheet by varying the context.
 */

export interface LayoutContext {
  project?: string;
  client?: string;
  sheetTitle?: string;
  sheetNumber?: string;
  sheetCount?: number;
  date?: string;          // ISO-8601 (YYYY-MM-DD)
  drawnBy?: string;
  checkedBy?: string;
  scale?: string;         // "1:100" etc.
  revision?: string;
  notes?: string;
  /** Extra freeform tokens for user-defined title blocks. */
  extra?: Record<string, string>;
}

/** Resolve `{{tokens}}` in an SVG / text template against a context. */
export function renderTitleBlock(template: string, ctx: LayoutContext): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, raw: string) => {
    const key = raw.trim();
    // Built-in autotext
    if (key === 'date')       return ctx.date ?? new Date().toISOString().slice(0, 10);
    if (key === 'datetime')   return new Date().toISOString();
    if (key === 'sheet-count') return ctx.sheetCount !== undefined ? String(ctx.sheetCount) : '';
    // Core fields
    const coreMap: Record<string, string | number | undefined> = {
      project: ctx.project,
      client:  ctx.client,
      'sheet-title': ctx.sheetTitle,
      'sheet-number': ctx.sheetNumber,
      'drawn-by': ctx.drawnBy,
      'checked-by': ctx.checkedBy,
      scale: ctx.scale,
      revision: ctx.revision,
      notes: ctx.notes,
    };
    if (key in coreMap) {
      const v = coreMap[key];
      return v == null ? '' : String(v);
    }
    // Extra user tokens
    const extra = ctx.extra?.[key];
    if (extra !== undefined) return extra;
    return '';
  });
}

/** Minimal built-in title-block SVG template used when users haven't authored their own. */
export const DEFAULT_TITLE_BLOCK_SVG = `
<g class="title-block">
  <rect x="0" y="0" width="200" height="40" fill="none" stroke="black" stroke-width="0.5"/>
  <text x="4"   y="10" font-family="sans-serif" font-size="5" font-weight="bold">{{project}}</text>
  <text x="4"   y="18" font-family="sans-serif" font-size="3">{{client}}</text>
  <text x="4"   y="28" font-family="sans-serif" font-size="4">{{sheet-title}}</text>
  <text x="4"   y="36" font-family="sans-serif" font-size="2.5">Scale {{scale}}</text>
  <text x="160" y="36" font-family="sans-serif" font-size="2.5">{{sheet-number}}</text>
  <text x="160" y="10" font-family="sans-serif" font-size="2.5">Date {{date}}</text>
  <text x="160" y="18" font-family="sans-serif" font-size="2.5">Rev {{revision}}</text>
  <text x="160" y="28" font-family="sans-serif" font-size="2.5">Drawn {{drawn-by}}</text>
</g>`.trim();

/** ISO paper sizes in millimetres, landscape orientation. */
export const ISO_SHEET_SIZES: Record<string, { w: number; h: number }> = {
  A0: { w: 1189, h: 841 },
  A1: { w: 841,  h: 594 },
  A2: { w: 594,  h: 420 },
  A3: { w: 420,  h: 297 },
  A4: { w: 297,  h: 210 },
};

/** ANSI paper sizes in millimetres, landscape orientation. */
export const ANSI_SHEET_SIZES: Record<string, { w: number; h: number }> = {
  A: { w: 279, h: 216 },   // 11 × 8.5 in
  B: { w: 432, h: 279 },   // 17 × 11 in
  C: { w: 559, h: 432 },   // 22 × 17 in
  D: { w: 864, h: 559 },   // 34 × 22 in
  E: { w: 1118, h: 864 },  // 44 × 34 in
};
