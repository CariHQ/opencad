/**
 * Label autotext renderer — T-DOC-034 (#327).
 *
 * Given a template string like `{{Tag}} · {{Width}}×{{Height}}` and a host
 * element, resolve the tokens against the host's `properties` map and emit
 * the rendered label string. Missing tokens render as empty (not the
 * literal `{{...}}`) so a label applied to the wrong element type degrades
 * gracefully.
 *
 * Token formatting:
 *   - Plain token: `{{Tag}}` → raw value coerced to string.
 *   - Pipe-formatted: `{{Width|mm->m}}` → apply a named formatter.
 *       mm->m      convert millimetres to metres (÷1000, one decimal).
 *       mm->ft-in  convert millimetres to feet-and-inches ("4'-3"").
 *       upper      uppercase the string.
 *       lower      lowercase the string.
 *       round0..n  round to N decimal places.
 */

import type { ElementSchema } from '@opencad/document';

export type LabelFormat =
  | 'mm->m'
  | 'mm->ft-in'
  | 'upper'
  | 'lower'
  | `round${number}`;

function applyFormat(value: unknown, format: string): string {
  if (value == null) return '';
  const str = String(value);
  switch (format) {
    case 'upper': return str.toUpperCase();
    case 'lower': return str.toLowerCase();
    case 'mm->m': {
      const n = Number(value);
      if (!isFinite(n)) return str;
      return (n / 1000).toFixed(1) + ' m';
    }
    case 'mm->ft-in': {
      const n = Number(value);
      if (!isFinite(n)) return str;
      const totalIn = n / 25.4;
      const ft = Math.floor(totalIn / 12);
      const inches = Math.round(totalIn - ft * 12);
      return `${ft}'-${inches}"`;
    }
    default: {
      const m = /^round(\d+)$/.exec(format);
      if (m) {
        const n = Number(value);
        if (!isFinite(n)) return str;
        const digits = parseInt(m[1]!, 10);
        return n.toFixed(digits);
      }
      return str;
    }
  }
}

/** Resolve a template against a host element. */
export function renderLabelText(
  template: string,
  host: ElementSchema | null | undefined,
): string {
  if (!template) return '';
  if (!host) return template.replace(/\{\{[^}]+\}\}/g, '');

  const props = host.properties as Record<string, { value: unknown }>;
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, tokenRaw: string) => {
    const token = tokenRaw.trim();
    const [keyRaw, formatRaw] = token.split('|').map((s) => s.trim());
    if (!keyRaw) return '';
    // Autotext tokens that aren't element props
    if (keyRaw === 'date')     return new Date().toISOString().slice(0, 10);
    if (keyRaw === 'datetime') return new Date().toISOString();
    if (keyRaw === 'type')     return host.type;
    if (keyRaw === 'id')       return host.id;

    const value = props[keyRaw]?.value;
    if (value == null) return '';
    return formatRaw ? applyFormat(value, formatRaw) : String(value);
  });
}

/**
 * Return the list of tokens valid for a given element type — the editor's
 * token picker lists these. Pulled from the element's existing property
 * keys plus the built-in autotext tokens.
 */
export function availableTokensFor(element: ElementSchema | null | undefined): string[] {
  if (!element) return [];
  const keys = Object.keys(element.properties as Record<string, unknown>);
  return ['id', 'type', 'date', 'datetime', ...keys];
}
