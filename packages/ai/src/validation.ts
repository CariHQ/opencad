/**
 * AI Validation Module
 * Pure domain logic for floor plan and model validation
 * T-AI-002 through T-AI-005, T-AI-010 through T-AI-012, T-AI-020 through T-AI-024
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'hallway' | 'dining' | 'other';
  width: number;
  depth: number;
  x: number;
  y: number;
}

export interface RoomConnection {
  from: string;
  to: string;
}

export interface FloorPlan {
  rooms: Room[];
  targetArea: number;
  connections: RoomConnection[];
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ModelElement {
  id: string;
  type: string;
  bbox: BBox;
  properties: Record<string, unknown>;
}

export interface ModelDocument {
  elements: Record<string, ModelElement>;
  history: ModelDocument[];
}

export interface ComplianceViolation {
  roomId: string;
  type: 'min_dimension' | 'min_area' | 'clearance';
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  suggestedMinWidth?: number;
  suggestedMinDepth?: number;
}

export interface IntegrityIssue {
  type: 'overlap' | 'door_outside_wall' | 'window_outside_wall' | 'missing_host';
  elementIds: string[];
  message: string;
}

export interface ChangeSpec {
  roomId?: string;
  property: string;
  value: unknown;
}

export interface Fix {
  action: 'resize' | 'relocate' | 'remove';
  roomId?: string;
  newWidth?: number;
  newDepth?: number;
  message?: string;
}

// ─── IBC minimum dimension rules ─────────────────────────────────────────────

const IBC_RULES: Record<
  Room['type'],
  { minWidth?: number; minDepth?: number; minArea?: number } | null
> = {
  bedroom: { minWidth: 3.0, minDepth: 2.4, minArea: 7.0 },
  bathroom: { minWidth: 1.5, minDepth: 2.0, minArea: 3.0 },
  kitchen: { minWidth: 2.4, minDepth: 2.4, minArea: 5.0 },
  living: null,
  hallway: null,
  dining: null,
  other: null,
};

const IBC_CITATIONS: Record<string, string> = {
  min_bedroom_dimension: 'IBC Section 1208.3 — Minimum room dimensions: bedroom 7m², min 3m wide',
  min_bathroom_area: 'IBC Section 1208.4 — Minimum bathroom area: 2.7m²',
  min_kitchen_clearance: 'IBC Section 1208.5 — Kitchen minimum clearance: 1.2m between counters',
  min_room_area: 'IBC Section 1208.1 — Habitable space minimum area',
  min_dimension: 'IBC Section 1208.3 — Room minimum dimension',
  min_area: 'IBC Section 1208.1 — Minimum room area',
  clearance: 'IBC Section 1208.5 — Minimum clearance requirements',
};

// ─── T-AI-002: Floor plan area validation ─────────────────────────────────────

export function validateFloorPlanArea(
  rooms: Room[],
  targetArea: number
): { passed: boolean; totalArea: number; deviation: number } {
  const totalArea = rooms.reduce((sum, r) => sum + r.width * r.depth, 0);
  const deviation = Math.abs((totalArea - targetArea) / targetArea) * 100;
  return { passed: deviation <= 5, totalArea, deviation };
}

// ─── T-AI-003: Room dimension compliance ─────────────────────────────────────

export function validateRoomDimensions(rooms: Room[]): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  for (const room of rooms) {
    const rules = IBC_RULES[room.type];
    if (!rules) continue;

    const area = room.width * room.depth;

    if (rules.minWidth !== undefined && room.width < rules.minWidth) {
      violations.push({
        roomId: room.id,
        type: 'min_dimension',
        rule: `min_${room.type}_dimension`,
        severity: 'error',
        message: `${room.name} width ${room.width}m is below IBC minimum ${rules.minWidth}m`,
        suggestedMinWidth: rules.minWidth,
        suggestedMinDepth: rules.minDepth,
      });
    }

    if (rules.minDepth !== undefined && room.depth < rules.minDepth) {
      violations.push({
        roomId: room.id,
        type: 'min_dimension',
        rule: `min_${room.type}_dimension`,
        severity: 'error',
        message: `${room.name} depth ${room.depth}m is below IBC minimum ${rules.minDepth}m`,
        suggestedMinWidth: rules.minWidth,
        suggestedMinDepth: rules.minDepth,
      });
    }

    if (rules.minArea !== undefined && area < rules.minArea) {
      violations.push({
        roomId: room.id,
        type: 'min_area',
        rule: `min_${room.type}_area`,
        severity: 'error',
        message: `${room.name} area ${area.toFixed(1)}m² is below IBC minimum ${rules.minArea}m²`,
        suggestedMinWidth: rules.minWidth,
        suggestedMinDepth: rules.minDepth,
      });
    }
  }

  return violations;
}

// ─── T-AI-004: Circulation path validation ────────────────────────────────────

export function validateCirculationPaths(
  rooms: Room[],
  connections: RoomConnection[]
): {
  passed: boolean;
  isolatedRooms: string[];
  chainedRooms: string[];
} {
  const hallway = rooms.find((r) => r.type === 'hallway');
  const hallwayId = hallway?.id;

  // Build adjacency graph (bidirectional)
  const graph: Record<string, Set<string>> = {};
  for (const room of rooms) {
    graph[room.id] = new Set();
  }
  for (const conn of connections) {
    graph[conn.from]?.add(conn.to);
    graph[conn.to]?.add(conn.from);
  }

  // BFS from hallway to find all reachable rooms
  const reachable = new Set<string>();
  if (hallwayId) {
    const queue = [hallwayId];
    reachable.add(hallwayId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of graph[current] ?? []) {
        if (!reachable.has(neighbor)) {
          reachable.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  const isolatedRooms = rooms
    .filter((r) => r.id !== hallwayId && !reachable.has(r.id))
    .map((r) => r.id);

  // Find rooms that can ONLY be reached by passing through a non-hallway room
  const chainedRooms: string[] = [];
  if (hallwayId) {
    for (const room of rooms) {
      if (room.id === hallwayId) continue;
      if (!reachable.has(room.id)) continue;

      // Check: is room directly connected to hallway?
      const directToHallway = (graph[room.id] ?? new Set()).has(hallwayId);
      if (!directToHallway && reachable.has(room.id)) {
        chainedRooms.push(room.id);
      }
    }
  }

  return {
    passed: isolatedRooms.length === 0,
    isolatedRooms,
    chainedRooms,
  };
}

// ─── T-AI-005: Apply isolated change ──────────────────────────────────────────

export function applyIsolatedChange(plan: FloorPlan, change: ChangeSpec): FloorPlan {
  const rooms = plan.rooms.map((r) => {
    if (change.roomId && r.id !== change.roomId) return r;
    if (!change.roomId) return r;
    return { ...r, [change.property]: change.value };
  });

  const updated: FloorPlan = { ...plan, rooms };

  if (!change.roomId && change.property in plan) {
    (updated as unknown as Record<string, unknown>)[change.property] = change.value;
    updated.rooms = plan.rooms; // rooms unchanged
  }

  return updated;
}

// ─── T-AI-010: Element modification ──────────────────────────────────────────

export function modifyElement(
  model: ModelDocument,
  elementId: string,
  changes: Partial<ModelElement>
): ModelDocument {
  if (!(elementId in model.elements)) return model;

  return {
    ...model,
    elements: {
      ...model.elements,
      [elementId]: {
        ...model.elements[elementId]!,
        ...changes,
        properties: {
          ...model.elements[elementId]!.properties,
          ...(changes.properties ?? {}),
        },
      },
    },
  };
}

// ─── T-AI-011: Model integrity validation ─────────────────────────────────────

export function validateModelIntegrity(model: ModelDocument): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const elements = Object.values(model.elements);
  const walls = elements.filter((e) => e.type === 'wall');

  // Check for wall overlaps
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      if (_bboxOverlaps(walls[i]!.bbox, walls[j]!.bbox)) {
        issues.push({
          type: 'overlap',
          elementIds: [walls[i]!.id, walls[j]!.id],
          message: `Walls ${walls[i]!.id} and ${walls[j]!.id} overlap`,
        });
      }
    }
  }

  // Check doors/windows are within their host wall
  const hosted = elements.filter((e) => e.type === 'door' || e.type === 'window');
  for (const el of hosted) {
    const hostId = el.properties['hostWall'] as string | undefined;
    if (!hostId) continue;
    const host = model.elements[hostId];
    if (!host) {
      issues.push({
        type: 'missing_host',
        elementIds: [el.id],
        message: `${el.type} ${el.id} references missing wall ${hostId}`,
      });
      continue;
    }
    if (!_bboxContains(host.bbox, el.bbox)) {
      issues.push({
        type: 'door_outside_wall',
        elementIds: [el.id, host.id],
        message: `${el.type} ${el.id} is not within host wall ${hostId}`,
      });
    }
  }

  return issues;
}

function _bboxOverlaps(a: BBox, b: BBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function _bboxContains(outer: BBox, inner: BBox): boolean {
  return (
    inner.x >= outer.x &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y >= outer.y &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

// ─── T-AI-012: Undo functionality ────────────────────────────────────────────

export function createUndoSnapshot(model: ModelDocument): ModelDocument {
  return JSON.parse(JSON.stringify({ ...model, history: [] })) as ModelDocument;
}

export function restoreSnapshot(
  _current: ModelDocument,
  snapshot: ModelDocument
): ModelDocument {
  return JSON.parse(JSON.stringify({ ...snapshot, history: [] })) as ModelDocument;
}

// ─── T-AI-020/021: IBC compliance ──────────────────────────────────────────────

export function runIBCCompliance(rooms: Room[]): ComplianceViolation[] {
  return validateRoomDimensions(rooms);
}

// ─── T-AI-022: Code citation ──────────────────────────────────────────────────

export function getCitationForRule(rule: string): string {
  return IBC_CITATIONS[rule] ?? 'Unknown rule — no citation available';
}

// ─── T-AI-023: Suggested fix ─────────────────────────────────────────────────

export function suggestFix(violation: ComplianceViolation): Fix {
  return {
    action: 'resize',
    roomId: violation.roomId,
    newWidth: violation.suggestedMinWidth ?? 3,
    newDepth: violation.suggestedMinDepth ?? 3,
    message: `Resize room to meet IBC minimum: ${violation.suggestedMinWidth}m × ${violation.suggestedMinDepth}m`,
  };
}

// ─── T-AI-024: Offline compliance ────────────────────────────────────────────

export function runOfflineCompliance(rooms: Room[]): ComplianceViolation[] {
  // Fully deterministic, synchronous — same as IBC rules, no network
  return runIBCCompliance(rooms);
}

// ─── T-AI-005/006/007: BIM Element Validation ────────────────────────────────

/**
 * Result of validating a single BIM element against document rules.
 * - `valid`: false if any hard errors are present
 * - `errors`: blocking rule violations (element should not be added)
 * - `warnings`: non-blocking advisory notices
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Minimal BIM element bounding box shape (avoids importing full ElementSchema in this file)
interface BimBBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

interface BimElement {
  id: string;
  type: string;
  layerId: string;
  properties: Record<string, { type: string; value: string | number | boolean | string[] }>;
  boundingBox: BimBBox;
}

interface BimDoc {
  organization: {
    layers: Record<string, { locked: boolean; name: string }>;
  };
  content: {
    elements: Record<string, BimElement>;
  };
}

/**
 * Validate a single BIM element against the rules of the given document.
 *
 * Rules checked (T-AI-005, T-AI-006, T-AI-007):
 *   - Walls must have Height > 0
 *   - Doors/Windows must be contained within at least one wall bounding box
 *   - Beams must have both StartX/StartY and EndX/EndY properties
 *   - Elements on locked layers → warning
 *   - Overlapping elements of same type on same layer → warning
 */
export function validateElement(element: BimElement, doc: BimDoc): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Rule: locked layer warning ────────────────────────────────────────────
  const layer = doc.organization.layers[element.layerId];
  if (layer?.locked) {
    warnings.push(`Element "${element.id}" is on locked layer "${layer.name}".`);
  }

  // ── Rule: wall must have positive height ──────────────────────────────────
  if (element.type === 'wall') {
    const heightProp = element.properties['Height'];
    const height = typeof heightProp?.value === 'number' ? heightProp.value : null;
    if (height === null || height <= 0) {
      errors.push(
        `Wall "${element.id}" must have a positive Height (got ${height ?? 'none'}).`,
      );
    }
  }

  // ── Rule: door/window must be contained within a wall ────────────────────
  if (element.type === 'door' || element.type === 'window') {
    const walls = Object.values(doc.content.elements).filter((e) => e.type === 'wall');
    const contained = walls.some((wall) =>
      _bim3DContains(wall.boundingBox, element.boundingBox),
    );
    if (!contained) {
      const kind = element.type === 'door' ? 'Door' : 'Window';
      warnings.push(`${kind} "${element.id}" is not contained within any wall.`);
    }
  }

  // ── Rule: beam must have start/end points ────────────────────────────────
  if (element.type === 'beam') {
    const hasStart = 'StartX' in element.properties && 'StartY' in element.properties;
    const hasEnd = 'EndX' in element.properties && 'EndY' in element.properties;
    if (!hasStart || !hasEnd) {
      errors.push(
        `Beam "${element.id}" must have start and end point properties (StartX/StartY and EndX/EndY) to span between supports.`,
      );
    }
  }

  // ── Rule: overlapping same-type elements on same layer → warning ──────────
  const sameTypeAndLayer = Object.values(doc.content.elements).filter(
    (e) =>
      e.id !== element.id &&
      e.type === element.type &&
      e.layerId === element.layerId,
  );
  for (const other of sameTypeAndLayer) {
    if (_bim3DOverlaps(element.boundingBox, other.boundingBox)) {
      warnings.push(
        `Element "${element.id}" overlaps with "${other.id}" (same type "${element.type}" on layer "${element.layerId}").`,
      );
      break; // one warning per element is sufficient
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function _bim3DOverlaps(a: BimBBox, b: BimBBox): boolean {
  return (
    a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y
  );
}

function _bim3DContains(outer: BimBBox, inner: BimBBox): boolean {
  return (
    inner.min.x >= outer.min.x &&
    inner.max.x <= outer.max.x &&
    inner.min.y >= outer.min.y &&
    inner.max.y <= outer.max.y
  );
}
