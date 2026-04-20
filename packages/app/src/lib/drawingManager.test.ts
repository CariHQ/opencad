/**
 * T-DOC-036 drawing manager tests (GitHub issue #329).
 *
 *   T-DOC-036-001 — nextSheetNumber('plan') → A-101 on first call
 *   T-DOC-036-002 — resolveViewReference → "<n> / <sheetNumber>"
 *   T-DOC-036-003 — moving view between sheets updates the cross-ref
 *   T-DOC-036-004 — pruneDeadPlacements clears references to deleted sheets
 */
import { describe, it, expect } from 'vitest';
import {
  nextSheetNumber, resolveViewReference, placeOnSheet, removePlacement,
  pruneDeadPlacements,
  type DrawingIndex, type Sheet,
} from './drawingManager';

describe('T-DOC-036: drawing manager', () => {
  it('T-DOC-036-001: first plan → A-101, second plan → A-102', () => {
    expect(nextSheetNumber('plan', [])).toBe('A-101');
    const s1: Sheet = { id: '1', sheetNumber: 'A-101', category: 'plan', name: '' };
    expect(nextSheetNumber('plan', [s1])).toBe('A-102');
  });

  it('first section → A-301', () => {
    expect(nextSheetNumber('section', [])).toBe('A-301');
  });

  it('nextSheetNumber fills gaps (A-101 + A-103 → next is A-102)', () => {
    const sheets: Sheet[] = [
      { id: '1', sheetNumber: 'A-101', category: 'plan', name: '' },
      { id: '3', sheetNumber: 'A-103', category: 'plan', name: '' },
    ];
    expect(nextSheetNumber('plan', sheets)).toBe('A-102');
  });

  it('T-DOC-036-002: resolveViewReference returns "n / A-301" after placement', () => {
    const sheet: Sheet = { id: 'sheet-A301', sheetNumber: 'A-301', category: 'section', name: '' };
    let idx: DrawingIndex = { sheets: { 'sheet-A301': sheet }, placements: {} };
    idx = placeOnSheet(idx, 'view-1', 'sheet-A301');
    expect(resolveViewReference('view-1', idx)).toBe('1 / A-301');
  });

  it('T-DOC-036-003: moving view to a new sheet updates the cross-ref', () => {
    const s1: Sheet = { id: 'sheet-A301', sheetNumber: 'A-301', category: 'section', name: '' };
    const s2: Sheet = { id: 'sheet-A302', sheetNumber: 'A-302', category: 'section', name: '' };
    let idx: DrawingIndex = { sheets: { [s1.id]: s1, [s2.id]: s2 }, placements: {} };
    idx = placeOnSheet(idx, 'view-1', s1.id);
    expect(resolveViewReference('view-1', idx)).toBe('1 / A-301');
    idx = placeOnSheet(idx, 'view-1', s2.id);
    expect(resolveViewReference('view-1', idx)).toBe('1 / A-302');
  });

  it('removePlacement clears the cross-ref', () => {
    const s: Sheet = { id: 's', sheetNumber: 'A-101', category: 'plan', name: '' };
    let idx: DrawingIndex = { sheets: { s }, placements: {} };
    idx = placeOnSheet(idx, 'v', 's');
    idx = removePlacement(idx, 'v');
    expect(resolveViewReference('v', idx)).toBe('');
  });

  it('T-DOC-036-004: pruneDeadPlacements drops references to deleted sheets', () => {
    const s: Sheet = { id: 's', sheetNumber: 'A-101', category: 'plan', name: '' };
    let idx: DrawingIndex = { sheets: { s }, placements: {} };
    idx = placeOnSheet(idx, 'v', 's');
    // Delete the sheet
    idx = { ...idx, sheets: {} };
    expect(resolveViewReference('v', idx)).toBe('1 / ?');
    const pruned = pruneDeadPlacements(idx);
    expect(resolveViewReference('v', pruned)).toBe('');
  });

  it('second viewport on same sheet gets number 2', () => {
    const sheet: Sheet = { id: 's', sheetNumber: 'A-301', category: 'section', name: '' };
    let idx: DrawingIndex = { sheets: { s: sheet }, placements: {} };
    idx = placeOnSheet(idx, 'v1', 's');
    idx = placeOnSheet(idx, 'v2', 's');
    expect(resolveViewReference('v2', idx)).toBe('2 / A-301');
  });
});
