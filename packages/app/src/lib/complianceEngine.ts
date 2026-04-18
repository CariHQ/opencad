/**
 * Local building code compliance rule engine.
 *
 * Operates directly on DocumentSchema — purely synchronous, zero network
 * calls, works offline.
 *
 * Rules implemented (IBC / IRC / ADA):
 *   R001  Minimum door width (ADA / IBC 1010.1.1) — 810 mm
 *   R002  Minimum ceiling height (IBC 1208.2 / IRC R305.1) — 2400 mm
 *   R003  Maximum stair riser height (IBC 1011.5.2 / IRC R311.7.5.1) — 196 mm
 *   R004  Minimum corridor / hallway width (IBC 1005.1) — 900 mm
 *   R005  Minimum window area ≥ 10 % of floor area (IBC 1205.2 / IRC R303.1)
 *   R006  Minimum habitable room area (IBC 1208.3 / IRC R304.1) — 7 m²
 */

import type { DocumentSchema, ElementSchema } from '@opencad/document';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ComplianceRule {
  id: string;
  name: string;
  category: 'egress' | 'accessibility' | 'structural' | 'fire' | 'dimensions';
  severity: 'error' | 'warning' | 'info';
  check: (doc: DocumentSchema) => ComplianceViolation[];
}

export interface ComplianceViolation {
  ruleId: string;
  elementId?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestedFix?: string;
}

// ---------------------------------------------------------------------------
// Property helpers
// ---------------------------------------------------------------------------

function getNumProp(el: ElementSchema, key: string): number | undefined {
  const pv = el.properties[key];
  if (pv && pv.type === 'number' && typeof pv.value === 'number') {
    return pv.value;
  }
  return undefined;
}

function getStrProp(el: ElementSchema, key: string): string | undefined {
  const pv = el.properties[key];
  if (pv && pv.type === 'string' && typeof pv.value === 'string') {
    return pv.value;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// R001: Minimum door width — 810 mm (ADA / IBC 1010.1.1 ~32")
// ---------------------------------------------------------------------------

const MIN_DOOR_WIDTH_MM = 810;

const R001: ComplianceRule = {
  id: 'R001',
  name: 'Minimum door width',
  category: 'accessibility',
  severity: 'error',
  check(doc) {
    const violations: ComplianceViolation[] = [];
    for (const el of Object.values(doc.content.elements)) {
      if (el.type !== 'door') continue;
      // Default to 900 mm when property is absent (standard door width)
      const width = getNumProp(el, 'Width') ?? 900;
      if (width < MIN_DOOR_WIDTH_MM) {
        violations.push({
          ruleId: 'R001',
          elementId: el.id,
          message: `Door width ${width}mm is below the minimum ${MIN_DOOR_WIDTH_MM}mm (ADA / IBC 1010.1.1).`,
          severity: 'error',
          suggestedFix: `Increase door width to at least ${MIN_DOOR_WIDTH_MM}mm.`,
        });
      }
    }
    return violations;
  },
};

// ---------------------------------------------------------------------------
// R002: Minimum ceiling height — 2400 mm (IBC 1208.2 / IRC R305.1)
// ---------------------------------------------------------------------------

const MIN_CEILING_HEIGHT_MM = 2400;

const R002: ComplianceRule = {
  id: 'R002',
  name: 'Minimum ceiling height',
  category: 'dimensions',
  severity: 'error',
  check(doc) {
    const violations: ComplianceViolation[] = [];
    for (const el of Object.values(doc.content.elements)) {
      if (el.type !== 'space') continue;
      const height = getNumProp(el, 'CeilingHeight');
      if (height === undefined) continue;
      if (height < MIN_CEILING_HEIGHT_MM) {
        violations.push({
          ruleId: 'R002',
          elementId: el.id,
          message: `Ceiling height ${height}mm in space "${el.id}" is below the minimum ${MIN_CEILING_HEIGHT_MM}mm (IBC 1208.2).`,
          severity: 'error',
          suggestedFix: `Raise the ceiling height to at least ${MIN_CEILING_HEIGHT_MM}mm.`,
        });
      }
    }
    return violations;
  },
};

// ---------------------------------------------------------------------------
// R003: Stair riser height — max 196 mm (IBC 1011.5.2 / IRC R311.7.5.1)
// ---------------------------------------------------------------------------

const MAX_RISER_HEIGHT_MM = 196;

const R003: ComplianceRule = {
  id: 'R003',
  name: 'Stair riser height',
  category: 'egress',
  severity: 'error',
  check(doc) {
    const violations: ComplianceViolation[] = [];
    for (const el of Object.values(doc.content.elements)) {
      if (el.type !== 'stair') continue;
      const riser = getNumProp(el, 'RiserHeight');
      if (riser === undefined) continue;
      if (riser > MAX_RISER_HEIGHT_MM) {
        violations.push({
          ruleId: 'R003',
          elementId: el.id,
          message: `Stair riser height ${riser}mm in "${el.id}" exceeds the maximum ${MAX_RISER_HEIGHT_MM}mm (IBC 1011.5.2).`,
          severity: 'error',
          suggestedFix: `Reduce riser height to ${MAX_RISER_HEIGHT_MM}mm or less.`,
        });
      }
    }
    return violations;
  },
};

// ---------------------------------------------------------------------------
// R004: Minimum hallway / corridor width — 900 mm (IBC 1005.1)
// ---------------------------------------------------------------------------

const MIN_CORRIDOR_WIDTH_MM = 900;
const CORRIDOR_SPACE_TYPES = new Set(['corridor', 'hallway']);

const R004: ComplianceRule = {
  id: 'R004',
  name: 'Minimum hallway width',
  category: 'egress',
  severity: 'error',
  check(doc) {
    const violations: ComplianceViolation[] = [];
    for (const el of Object.values(doc.content.elements)) {
      if (el.type !== 'space') continue;
      const spaceType = getStrProp(el, 'spaceType');
      if (!spaceType || !CORRIDOR_SPACE_TYPES.has(spaceType.toLowerCase())) continue;
      const width = getNumProp(el, 'Width');
      if (width === undefined) continue;
      if (width < MIN_CORRIDOR_WIDTH_MM) {
        violations.push({
          ruleId: 'R004',
          elementId: el.id,
          message: `${spaceType} "${el.id}" width ${width}mm is below the minimum ${MIN_CORRIDOR_WIDTH_MM}mm (IBC 1005.1).`,
          severity: 'error',
          suggestedFix: `Widen the ${spaceType} to at least ${MIN_CORRIDOR_WIDTH_MM}mm.`,
        });
      }
    }
    return violations;
  },
};

// ---------------------------------------------------------------------------
// R005: Window area ≥ 10 % of floor area (IBC 1205.2 / IRC R303.1)
//
// The rule checks window elements that carry both an Area and a FloorArea
// numeric property (set by the tool or import). If Area / FloorArea < 0.10
// a warning is emitted.
// ---------------------------------------------------------------------------

const MIN_WINDOW_RATIO = 0.10;

const R005: ComplianceRule = {
  id: 'R005',
  name: 'Window area to floor area ratio',
  category: 'dimensions',
  severity: 'warning',
  check(doc) {
    const violations: ComplianceViolation[] = [];
    for (const el of Object.values(doc.content.elements)) {
      if (el.type !== 'window') continue;
      const area = getNumProp(el, 'Area');
      const floorArea = getNumProp(el, 'FloorArea');
      if (area === undefined || floorArea === undefined || floorArea <= 0) continue;
      const ratio = area / floorArea;
      if (ratio < MIN_WINDOW_RATIO) {
        const pct = (ratio * 100).toFixed(1);
        violations.push({
          ruleId: 'R005',
          elementId: el.id,
          message: `Window "${el.id}" area is ${pct}% of floor area — below the 10% minimum for natural light (IBC 1205.2).`,
          severity: 'warning',
          suggestedFix: `Increase window area to at least ${(floorArea * MIN_WINDOW_RATIO).toFixed(2)} m² (10% of ${floorArea} m² floor area).`,
        });
      }
    }
    return violations;
  },
};

// ---------------------------------------------------------------------------
// R006: Minimum habitable room area — 7 m² (IBC 1208.3 / IRC R304.1)
//
// Applies to spaces whose spaceType is a habitable room category.
// ---------------------------------------------------------------------------

const MIN_HABITABLE_AREA_M2 = 7;
const HABITABLE_TYPES = new Set([
  'bedroom', 'living', 'living room', 'living_room',
  'dining', 'dining room', 'dining_room',
  'study', 'office',
]);

const R006: ComplianceRule = {
  id: 'R006',
  name: 'Minimum habitable room area',
  category: 'dimensions',
  severity: 'error',
  check(doc) {
    const violations: ComplianceViolation[] = [];
    for (const el of Object.values(doc.content.elements)) {
      if (el.type !== 'space') continue;
      const spaceType = getStrProp(el, 'spaceType');
      if (!spaceType || !HABITABLE_TYPES.has(spaceType.toLowerCase())) continue;
      const area = getNumProp(el, 'Area');
      if (area === undefined) continue;
      if (area < MIN_HABITABLE_AREA_M2) {
        violations.push({
          ruleId: 'R006',
          elementId: el.id,
          message: `Habitable room "${el.id}" (${spaceType}) area ${area.toFixed(2)} m² is below the minimum ${MIN_HABITABLE_AREA_M2} m² (IBC 1208.3).`,
          severity: 'error',
          suggestedFix: `Expand the room to at least ${MIN_HABITABLE_AREA_M2} m².`,
        });
      }
    }
    return violations;
  },
};

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

export const COMPLIANCE_RULES: ComplianceRule[] = [R001, R002, R003, R004, R005, R006];

// ---------------------------------------------------------------------------
// runComplianceCheck — entry point
// ---------------------------------------------------------------------------

export function runComplianceCheck(doc: DocumentSchema): ComplianceViolation[] {
  return COMPLIANCE_RULES.flatMap((rule) => rule.check(doc));
}
