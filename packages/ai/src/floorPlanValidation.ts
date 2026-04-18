/**
 * Floor Plan Validation
 * T-AI-002, T-AI-003, T-AI-004
 *
 * Validates DocumentSchema floor plans against:
 *  - IBC minimum room sizes
 *  - Total area tolerance
 *  - Circulation path validity (no room only reachable through another room)
 */

import type { DocumentSchema, ElementSchema, PropertyValue } from '@opencad/document';

// ─── IBC Minimum Area Thresholds (m²) ────────────────────────────────────────

const IBC_MIN_AREA: Record<string, number> = {
  bedroom: 7.43,   // 80 sq ft
  bathroom: 2.23,  // 24 sq ft
  living: 13.0,
  dining: 13.0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numProp(props: Record<string, PropertyValue>, key: string): number | undefined {
  const v = props[key];
  if (!v || v.type !== 'number') return undefined;
  return v.value as number;
}

function strProp(props: Record<string, PropertyValue>, key: string): string | undefined {
  const v = props[key];
  if (!v || v.type !== 'string') return undefined;
  return v.value as string;
}

function getSpaceElements(schema: DocumentSchema): ElementSchema[] {
  return Object.values(schema.content.elements).filter((e) => e.type === 'space');
}

// ─── T-AI-003: validateRoomSizes ─────────────────────────────────────────────

export interface RoomSizeViolation {
  roomId: string;
  roomName: string;
  roomType: string;
  actualArea: number;
  minArea: number;
  message: string;
}

/**
 * Check each space element against IBC minimum area requirements.
 * Returns an array of violations (empty = all rooms compliant).
 */
export function validateRoomSizes(schema: DocumentSchema): RoomSizeViolation[] {
  const violations: RoomSizeViolation[] = [];
  const spaces = getSpaceElements(schema);

  for (const space of spaces) {
    const roomType = strProp(space.properties, 'RoomType') ?? '';
    const minArea = IBC_MIN_AREA[roomType];
    if (minArea === undefined) continue; // No rule for this type (e.g. hallway, kitchen)

    const area =
      numProp(space.properties, 'Area') ??
      (numProp(space.properties, 'Width') ?? 0) * (numProp(space.properties, 'Depth') ?? 0);

    if (area < minArea) {
      const name = strProp(space.properties, 'Name') ?? space.id;
      violations.push({
        roomId: space.id,
        roomName: name,
        roomType,
        actualArea: area,
        minArea,
        message: `${name} (${roomType}) has area ${area.toFixed(2)} m², below IBC minimum ${minArea} m²`,
      });
    }
  }

  return violations;
}

// ─── T-AI-002: validateTotalArea ─────────────────────────────────────────────

/**
 * Check whether the sum of all space areas is within `tolerancePct` % of `targetM2`.
 * Default tolerance is 5 %.
 */
export function validateTotalArea(
  schema: DocumentSchema,
  targetM2: number,
  tolerancePct = 5
): boolean {
  const spaces = getSpaceElements(schema);
  const total = spaces.reduce((sum, s) => {
    const area =
      numProp(s.properties, 'Area') ??
      (numProp(s.properties, 'Width') ?? 0) * (numProp(s.properties, 'Depth') ?? 0);
    return sum + area;
  }, 0);

  const deviation = Math.abs((total - targetM2) / targetM2) * 100;
  return deviation <= tolerancePct;
}

// ─── T-AI-004: validateCirculation ───────────────────────────────────────────

export interface CirculationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Validate that no room is only accessible by passing through another room.
 *
 * Strategy: each space element can declare `ConnectsTo` (the id of the element
 * it directly connects to — typically a hallway).  A room that connects ONLY
 * to a non-hallway room is in violation.  Rooms that have no `ConnectsTo`
 * property at all are considered connected to the hallway (direct egress).
 */
export function validateCirculation(schema: DocumentSchema): CirculationResult {
  const spaces = getSpaceElements(schema);
  const violations: string[] = [];

  // Identify all hallway / entry elements
  const hallwayIds = new Set<string>(
    spaces
      .filter((s) => {
        const rt = strProp(s.properties, 'RoomType') ?? '';
        return rt === 'hallway' || rt === 'entry' || rt === 'corridor';
      })
      .map((s) => s.id)
  );

  // For each non-hallway space, check that ConnectsTo points to a hallway
  // (or is absent, which means it connects directly to entry)
  for (const space of spaces) {
    const roomType = strProp(space.properties, 'RoomType') ?? '';
    if (hallwayIds.has(space.id)) continue; // skip the hallway itself

    const connectsTo = strProp(space.properties, 'ConnectsTo');
    if (connectsTo === undefined) continue; // no constraint — assumed valid

    if (!hallwayIds.has(connectsTo)) {
      // ConnectsTo points to something that isn't a hallway
      const targetSpace = schema.content.elements[connectsTo];
      const targetType = targetSpace
        ? (strProp(targetSpace.properties, 'RoomType') ?? 'unknown')
        : 'unknown';

      const name = strProp(space.properties, 'Name') ?? space.id;
      violations.push(
        `"${name}" (${roomType}) is only accessible through "${connectsTo}" (${targetType}), not directly via a hallway or entry.`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ─── Re-export combined validateFloorPlan for convenience ────────────────────

export interface FloorPlanValidationResult {
  valid: boolean;
  roomSizeViolations: RoomSizeViolation[];
  circulationResult: CirculationResult;
  totalAreaValid: boolean;
}

export function validateFloorPlan(
  schema: DocumentSchema,
  targetM2?: number,
  tolerancePct = 5
): FloorPlanValidationResult {
  const roomSizeViolations = validateRoomSizes(schema);
  const circulationResult = validateCirculation(schema);
  const totalAreaValid = targetM2 !== undefined
    ? validateTotalArea(schema, targetM2, tolerancePct)
    : true;

  return {
    valid:
      roomSizeViolations.length === 0 &&
      circulationResult.valid &&
      totalAreaValid,
    roomSizeViolations,
    circulationResult,
    totalAreaValid,
  };
}
