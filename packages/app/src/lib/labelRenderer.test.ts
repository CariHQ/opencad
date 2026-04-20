/**
 * T-DOC-034 label renderer tests (GitHub issue #327).
 *
 *   T-DOC-034-001 — `{{Width}}` on a door with Width:900 → "900"
 *   T-DOC-034-002 — missing token renders empty string, not the literal
 *   T-DOC-034-003 — mm->m format converts 900 → "0.9 m"
 *   T-DOC-034-004 — upper format uppercases the output
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import { renderLabelText, availableTokensFor } from './labelRenderer';

function door(props: Record<string, number | string>): ElementSchema {
  const propObj: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    propObj[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  }
  return {
    id: 'd-1', type: 'door', layerId: 'l',
    properties: propObj,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-DOC-034: labelRenderer', () => {
  it('T-DOC-034-001: `{{Width}}` renders the value as a string', () => {
    expect(renderLabelText('{{Width}}', door({ Width: 900 }))).toBe('900');
  });

  it('T-DOC-034-002: missing token renders as empty string', () => {
    const out = renderLabelText('Start:{{NotAProp}}:End', door({ Width: 900 }));
    expect(out).toBe('Start::End');
  });

  it('T-DOC-034-003: `{{Width|mm->m}}` converts mm → metres one-decimal', () => {
    expect(renderLabelText('{{Width|mm->m}}', door({ Width: 900 }))).toBe('0.9 m');
    expect(renderLabelText('{{Width|mm->m}}', door({ Width: 4500 }))).toBe('4.5 m');
  });

  it('T-DOC-034-004: `{{Name|upper}}` uppercases the result', () => {
    expect(renderLabelText('{{Name|upper}}', door({ Name: 'Front Door' }))).toBe('FRONT DOOR');
  });

  it('mm->ft-in converts 900 → "2\'-11\""', () => {
    expect(renderLabelText('{{Width|mm->ft-in}}', door({ Width: 900 }))).toBe(`2'-11"`);
  });

  it('roundN truncates decimals', () => {
    expect(renderLabelText('{{Area|round2}}', door({ Area: 12.345 }))).toBe('12.35');
  });

  it('multiple tokens render together', () => {
    expect(renderLabelText('{{Tag}} — {{Width}}×{{Height}}', door({ Tag: 'D-103', Width: 900, Height: 2100 })))
      .toBe('D-103 — 900×2100');
  });

  it('built-in `type` autotext resolves to element type', () => {
    expect(renderLabelText('{{type}}', door({ Width: 900 }))).toBe('door');
  });

  it('no host element returns template with tokens stripped', () => {
    expect(renderLabelText('Prefix {{X}} suffix', null)).toBe('Prefix  suffix');
  });

  it('availableTokensFor includes element props + built-in autotext', () => {
    const tokens = availableTokensFor(door({ Tag: 'D-1', Width: 900 }));
    expect(tokens).toContain('Tag');
    expect(tokens).toContain('Width');
    expect(tokens).toContain('id');
    expect(tokens).toContain('date');
  });
});
