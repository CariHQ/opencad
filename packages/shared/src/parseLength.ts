/**
 * parseLength — parse a length expression into millimetres (T-MOD-003).
 *
 * Accepts:
 *   '4500'          → 4500 mm (unitless treated as mm)
 *   '4500 mm'       → 4500
 *   '4.5 m'         → 4500
 *   '4.5m'          → 4500
 *   '45 cm'         → 450
 *   '15ft'          → 4572
 *   `15'`           → 4572 (imperial foot notation)
 *   `15'-3"`        → 4648.2 (feet and inches)
 *   `3"`            → 76.2
 *   '1/2"'          → 12.7
 *   '5 1/2"'        → 139.7
 *
 * Returns null when the input cannot be parsed as a length.
 */

const MM_PER_INCH = 25.4;
const MM_PER_FOOT = 304.8;
const MM_PER_CM = 10;
const MM_PER_METRE = 1000;

/** Try to parse a numeric fragment that may include a fraction, e.g. "5 1/2". */
function parseNumericFragment(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === '') return null;

  // "5 1/2" — integer + mixed fraction
  const mixed = /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (mixed) {
    const whole = parseInt(mixed[1]!, 10);
    const num = parseInt(mixed[2]!, 10);
    const den = parseInt(mixed[3]!, 10);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (num / den);
  }

  // "1/2" — fraction only
  const frac = /^(-?\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (frac) {
    const num = parseInt(frac[1]!, 10);
    const den = parseInt(frac[2]!, 10);
    if (den === 0) return null;
    return num / den;
  }

  // Plain float: "4500", "4.5", "-12"
  const plain = /^-?\d+(?:\.\d+)?$/.exec(trimmed);
  if (plain) return parseFloat(trimmed);

  return null;
}

export function parseLength(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (s === '') return null;

  // Pattern: `15'-3"` or `15'3"` → feet-and-inches
  const feetInches = /^(-?\d+(?:\.\d+)?)\s*'\s*-?\s*(\d+(?:\s+\d+\s*\/\s*\d+|\.\d+)?(?:\s*\/\s*\d+)?)\s*"?$/.exec(s);
  if (feetInches) {
    const feet = parseFloat(feetInches[1]!);
    const inchesPart = parseNumericFragment(feetInches[2]!);
    if (inchesPart == null) return null;
    const sign = feet < 0 ? -1 : 1;
    return feet * MM_PER_FOOT + sign * inchesPart * MM_PER_INCH;
  }

  // Pattern: just feet — `15'`
  const feetOnly = /^(-?\d+(?:\.\d+)?)\s*'$/.exec(s);
  if (feetOnly) {
    return parseFloat(feetOnly[1]!) * MM_PER_FOOT;
  }

  // Pattern: just inches — `3"` or `5 1/2"` or `1/2"`
  const inchesOnly = /^(.+?)\s*"$/.exec(s);
  if (inchesOnly) {
    const v = parseNumericFragment(inchesOnly[1]!);
    return v == null ? null : v * MM_PER_INCH;
  }

  // Explicit unit suffix — `4.5m`, `4500mm`, `45cm`, `15ft`, `3in`
  const unitMatch = /^(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km|ft|in)$/.exec(s);
  if (unitMatch) {
    const n = parseFloat(unitMatch[1]!);
    const u = unitMatch[2]!;
    switch (u) {
      case 'mm': return n;
      case 'cm': return n * MM_PER_CM;
      case 'm':  return n * MM_PER_METRE;
      case 'km': return n * MM_PER_METRE * 1000;
      case 'ft': return n * MM_PER_FOOT;
      case 'in': return n * MM_PER_INCH;
    }
  }

  // Bare number — treat as millimetres.
  const plain = parseNumericFragment(s);
  return plain;
}
