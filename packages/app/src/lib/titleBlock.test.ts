/**
 * T-DOC-008 title-block renderer tests (GitHub issue #301).
 *
 *   T-DOC-008-001 — `{{project}}` resolves to ctx.project
 *   T-DOC-008-002 — missing token renders as empty
 *   T-DOC-008-003 — autotext tokens resolve ({{date}} + {{sheet-count}})
 */
import { describe, it, expect } from 'vitest';
import {
  renderTitleBlock, DEFAULT_TITLE_BLOCK_SVG,
  ISO_SHEET_SIZES, ANSI_SHEET_SIZES,
} from './titleBlock';

describe('T-DOC-008: titleBlock', () => {
  it('T-DOC-008-001: `{{project}}` resolves from ctx', () => {
    expect(renderTitleBlock('Project: {{project}}', { project: 'Villa' }))
      .toBe('Project: Villa');
  });

  it('T-DOC-008-002: missing token renders empty, not literal', () => {
    expect(renderTitleBlock('Before: {{nonexistent}} :After', {}))
      .toBe('Before:  :After');
  });

  it('T-DOC-008-003: `{{date}}` autotext resolves from ctx.date when present', () => {
    expect(renderTitleBlock('{{date}}', { date: '2026-04-20' })).toBe('2026-04-20');
  });

  it('T-DOC-008-003b: `{{date}}` falls back to today when ctx.date is absent', () => {
    const out = renderTitleBlock('{{date}}', {});
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('T-DOC-008-003c: `{{sheet-count}}` resolves from ctx.sheetCount', () => {
    expect(renderTitleBlock('{{sheet-count}} sheets', { sheetCount: 12 }))
      .toBe('12 sheets');
  });

  it('extra tokens resolve via ctx.extra', () => {
    expect(renderTitleBlock('Job: {{jobcode}}', { extra: { jobcode: 'CA-2026-044' } }))
      .toBe('Job: CA-2026-044');
  });

  it('DEFAULT_TITLE_BLOCK_SVG substitutes all core fields', () => {
    const out = renderTitleBlock(DEFAULT_TITLE_BLOCK_SVG, {
      project: 'Villa', client: 'Owner', sheetTitle: 'Floor Plan',
      sheetNumber: 'A-101', scale: '1:100', date: '2026-04-20',
      drawnBy: 'KG', revision: 'A',
    });
    expect(out).toContain('Villa');
    expect(out).toContain('Owner');
    expect(out).toContain('A-101');
    expect(out).toContain('1:100');
    expect(out).not.toContain('{{');
  });

  it('ISO sheet sizes are landscape with w > h', () => {
    for (const [, s] of Object.entries(ISO_SHEET_SIZES)) {
      expect(s.w).toBeGreaterThan(s.h);
    }
  });

  it('ANSI sheet sizes include standard A through E', () => {
    expect(Object.keys(ANSI_SHEET_SIZES)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('A3 ISO matches 420 × 297 mm exactly', () => {
    expect(ISO_SHEET_SIZES.A3).toEqual({ w: 420, h: 297 });
  });
});
