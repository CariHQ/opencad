/**
 * IBC (International Building Code) rule definitions.
 *
 * All rules are purely synchronous and make zero network calls.
 *
 * Rules implemented:
 *   IBC-1208.2  — Habitable room ceiling height ≥ 2.29 m (7'6")
 *   IBC-1208.3  — Habitable room floor area ≥ 7.43 m² (80 sq ft)
 *   IBC-1005.1  — Egress corridor width ≥ 0.9 m (36")
 *   IBC-1010.1.1 — Egress door clear width ≥ 0.813 m (32")
 */

import type { DocumentSchema } from '../types/document';
import type { Violation } from '../codeCompliance';
import { getNumProp, getStrProp, getBoolProp, setNumProp } from '../codeCompliance';

// ---------------------------------------------------------------------------
// Rule interface
// ---------------------------------------------------------------------------

export interface Rule {
  /** Short identifier, e.g. "IBC-1208.3" */
  id: string;
  /** Full citation shown in reports, e.g. "IBC Section 1208.3" */
  section: string;
  description: string;
  /** Synchronous check — returns zero or more Violation objects */
  check: (schema: DocumentSchema) => Violation[];
  /** Synchronous fix — returns a new DocumentSchema with the element corrected */
  fix: (schema: DocumentSchema, violation: Violation) => DocumentSchema;
}

// ---------------------------------------------------------------------------
// Habitable space types subject to floor-area and ceiling-height rules
// ---------------------------------------------------------------------------

const HABITABLE_TYPES = new Set(['bedroom', 'living', 'living room', 'dining', 'dining room']);

/** True when the element's spaceType property is a habitable room. */
function isHabitable(spaceType: string | undefined): boolean {
  if (!spaceType) return false;
  return HABITABLE_TYPES.has(spaceType.toLowerCase());
}

// ---------------------------------------------------------------------------
// IBC-1208.2: Habitable room ceiling height ≥ 2.29 m
// ---------------------------------------------------------------------------

const MIN_CEILING_HEIGHT_M = 2.29;

const rule1208_2: Rule = {
  id: 'IBC-1208.2',
  section: 'IBC Section 1208.2',
  description: 'Habitable rooms must have a ceiling height of at least 2.29 m (7\'6").',
  check(schema) {
    const violations: Violation[] = [];

    for (const element of Object.values(schema.content.elements)) {
      if (element.type !== 'space') continue;
      const spaceType = getStrProp(element, 'spaceType');
      if (!isHabitable(spaceType)) continue;

      const height = getNumProp(element, 'height');
      if (height === undefined) continue;
      if (height < MIN_CEILING_HEIGHT_M) {
        violations.push({
          ruleId: 'IBC-1208.2',
          section: 'IBC Section 1208.2',
          elementId: element.id,
          description:
            `Habitable room "${element.id}" has a ceiling height of ${height.toFixed(2)} m, ` +
            `which is below the minimum of ${MIN_CEILING_HEIGHT_M} m (7'6").`,
          severity: 'error',
          suggestedFix:
            `Increase the ceiling height of "${element.id}" to at least ${MIN_CEILING_HEIGHT_M} m (7'6").`,
        });
      }
    }

    return violations;
  },
  fix(schema, violation) {
    return setNumProp(schema, violation.elementId, 'height', MIN_CEILING_HEIGHT_M);
  },
};

// ---------------------------------------------------------------------------
// IBC-1208.3: Habitable room floor area ≥ 7.43 m²
// ---------------------------------------------------------------------------

const MIN_HABITABLE_AREA_M2 = 7.43;

const rule1208_3: Rule = {
  id: 'IBC-1208.3',
  section: 'IBC Section 1208.3',
  description: 'Habitable rooms must have a floor area of at least 7.43 m² (80 sq ft).',
  check(schema) {
    const violations: Violation[] = [];

    for (const element of Object.values(schema.content.elements)) {
      if (element.type !== 'space') continue;
      const spaceType = getStrProp(element, 'spaceType');
      if (!isHabitable(spaceType)) continue;

      const area = getNumProp(element, 'area');
      if (area === undefined) continue;
      if (area < MIN_HABITABLE_AREA_M2) {
        violations.push({
          ruleId: 'IBC-1208.3',
          section: 'IBC Section 1208.3',
          elementId: element.id,
          description:
            `Habitable room "${element.id}" has a floor area of ${area.toFixed(2)} m², ` +
            `which is below the minimum of ${MIN_HABITABLE_AREA_M2} m² (80 sq ft).`,
          severity: 'error',
          suggestedFix:
            `Expand the floor area of "${element.id}" to at least ${MIN_HABITABLE_AREA_M2} m² (80 sq ft).`,
        });
      }
    }

    return violations;
  },
  fix(schema, violation) {
    return setNumProp(schema, violation.elementId, 'area', MIN_HABITABLE_AREA_M2);
  },
};

// ---------------------------------------------------------------------------
// IBC-1005.1: Egress corridor width ≥ 0.9 m
// ---------------------------------------------------------------------------

const EGRESS_SPACE_TYPES = new Set(['corridor', 'hallway']);
const MIN_CORRIDOR_WIDTH_M = 0.9;

const rule1005_1: Rule = {
  id: 'IBC-1005.1',
  section: 'IBC Section 1005.1',
  description: 'Means of egress corridors must be at least 0.9 m (36") wide.',
  check(schema) {
    const violations: Violation[] = [];

    for (const element of Object.values(schema.content.elements)) {
      if (element.type !== 'space') continue;
      const spaceType = getStrProp(element, 'spaceType');
      if (!spaceType || !EGRESS_SPACE_TYPES.has(spaceType.toLowerCase())) continue;

      const width = getNumProp(element, 'width');
      if (width === undefined) continue;
      if (width < MIN_CORRIDOR_WIDTH_M) {
        violations.push({
          ruleId: 'IBC-1005.1',
          section: 'IBC Section 1005.1',
          elementId: element.id,
          description:
            `${spaceType} "${element.id}" has a width of ${width.toFixed(2)} m, ` +
            `which is below the minimum of ${MIN_CORRIDOR_WIDTH_M} m (36").`,
          severity: 'error',
          suggestedFix:
            `Widen "${element.id}" to at least ${MIN_CORRIDOR_WIDTH_M} m (36") to meet egress requirements.`,
        });
      }
    }

    return violations;
  },
  fix(schema, violation) {
    return setNumProp(schema, violation.elementId, 'width', MIN_CORRIDOR_WIDTH_M);
  },
};

// ---------------------------------------------------------------------------
// IBC-1010.1.1: Egress door clear width ≥ 0.813 m (32")
// ---------------------------------------------------------------------------

const MIN_EGRESS_DOOR_WIDTH_M = 0.813;

const rule1010_1_1: Rule = {
  id: 'IBC-1010.1.1',
  section: 'IBC Section 1010.1.1',
  description: 'Egress doors must have a clear width of at least 0.813 m (32").',
  check(schema) {
    const violations: Violation[] = [];

    for (const element of Object.values(schema.content.elements)) {
      if (element.type !== 'door') continue;
      if (!getBoolProp(element, 'isEgress')) continue;

      const width = getNumProp(element, 'width');
      if (width === undefined) continue;
      if (width < MIN_EGRESS_DOOR_WIDTH_M) {
        violations.push({
          ruleId: 'IBC-1010.1.1',
          section: 'IBC Section 1010.1.1',
          elementId: element.id,
          description:
            `Egress door "${element.id}" has a clear width of ${width.toFixed(3)} m, ` +
            `which is below the minimum of ${MIN_EGRESS_DOOR_WIDTH_M} m (32").`,
          severity: 'error',
          suggestedFix:
            `Increase the clear width of egress door "${element.id}" to at least ${MIN_EGRESS_DOOR_WIDTH_M} m (32").`,
        });
      }
    }

    return violations;
  },
  fix(schema, violation) {
    return setNumProp(schema, violation.elementId, 'width', MIN_EGRESS_DOOR_WIDTH_M);
  },
};

// ---------------------------------------------------------------------------
// Exported rule set
// ---------------------------------------------------------------------------

export const IBC_RULES: Rule[] = [rule1208_2, rule1208_3, rule1005_1, rule1010_1_1];
