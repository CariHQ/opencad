/**
 * T-DOC-032 worksheet tests (GitHub issue #325).
 *
 *   T-DOC-032-001 — createWorksheet returns entry
 *   T-DOC-032-003 — plan-view queries exclude worksheet elements
 */
import { describe, it, expect } from 'vitest';
import { createWorksheet, filterByWorksheet, isWorksheetId } from './worksheets';

function el(worksheetId?: string) {
  return {
    properties: worksheetId ? { WorksheetId: { value: worksheetId } } : {},
  };
}

describe('T-DOC-032: worksheets', () => {
  it('T-DOC-032-001: createWorksheet returns id + name', () => {
    const ws = createWorksheet('Finish Legend');
    expect(ws.name).toBe('Finish Legend');
    expect(isWorksheetId(ws.id)).toBe(true);
  });

  it('T-DOC-032-003: filterByWorksheet(null) excludes worksheet-tagged elements', () => {
    const model = el();
    const ws = el('ws-abc-1');
    const result = filterByWorksheet([model, ws], null);
    expect(result).toEqual([model]);
  });

  it('filterByWorksheet(id) returns only matching-worksheet elements', () => {
    const ws1 = el('ws-alpha');
    const ws2 = el('ws-beta');
    const model = el();
    const r = filterByWorksheet([ws1, ws2, model], 'ws-alpha');
    expect(r).toEqual([ws1]);
  });

  it('worksheet scale + description pass through options', () => {
    const ws = createWorksheet('Site Sketch', { scale: '1:200', description: 'vicinity' });
    expect(ws.scale).toBe('1:200');
    expect(ws.description).toBe('vicinity');
  });

  it('worksheet ids are unique across many createWorksheet calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) ids.add(createWorksheet(`W${i}`).id);
    expect(ids.size).toBe(20);
  });
});
