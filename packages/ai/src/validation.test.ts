/**
 * AI Validation Tests
 * T-AI-002 through T-AI-007, T-AI-010 through T-AI-012, T-AI-020 through T-AI-024
 */

import { describe, it, expect } from 'vitest';
import {
  validateFloorPlanArea,
  validateRoomDimensions,
  validateCirculationPaths,
  applyIsolatedChange,
  modifyElement,
  validateModelIntegrity,
  createUndoSnapshot,
  restoreSnapshot,
  runIBCCompliance,
  getCitationForRule,
  suggestFix,
  runOfflineCompliance,
  validateElement,
  type Room,
  type FloorPlan,
  type ModelDocument,
  type ComplianceViolation,
  type ValidationResult,
} from './validation';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function threeBedroomPlan(): FloorPlan {
  return {
    rooms: [
      { id: 'hall', name: 'Hallway', type: 'hallway', width: 3, depth: 5, x: 0, y: 0 },
      { id: 'liv', name: 'Living Room', type: 'living', width: 5, depth: 6, x: 3, y: 0 },
      { id: 'kit', name: 'Kitchen', type: 'kitchen', width: 4, depth: 4, x: 8, y: 0 },
      { id: 'bed1', name: 'Bedroom 1', type: 'bedroom', width: 4, depth: 4, x: 0, y: 5 },
      { id: 'bed2', name: 'Bedroom 2', type: 'bedroom', width: 4, depth: 4, x: 4, y: 5 },
      { id: 'bed3', name: 'Bedroom 3', type: 'bedroom', width: 3, depth: 3.5, x: 8, y: 5 },
      { id: 'bath', name: 'Bathroom', type: 'bathroom', width: 2, depth: 2, x: 0, y: 9 },
    ],
    targetArea: 100,
    connections: [
      { from: 'hall', to: 'liv' },
      { from: 'hall', to: 'bed1' },
      { from: 'hall', to: 'bed2' },
      { from: 'hall', to: 'bed3' },
      { from: 'hall', to: 'bath' },
      { from: 'hall', to: 'kit' },
    ],
  };
}

function simpleModel(): ModelDocument {
  return {
    elements: {
      wall1: {
        id: 'wall1',
        type: 'wall',
        bbox: { x: 0, y: 0, w: 10, h: 0.3 },
        properties: { name: 'Wall 1' },
      },
      wall2: {
        id: 'wall2',
        type: 'wall',
        bbox: { x: 0, y: 5, w: 10, h: 0.3 },
        properties: { name: 'Wall 2' },
      },
      door1: {
        id: 'door1',
        type: 'door',
        bbox: { x: 4, y: 0, w: 1, h: 0.3 },
        properties: { name: 'Front Door', hostWall: 'wall1' },
      },
    },
    history: [],
  };
}

// ─── T-AI-002: Floor Plan Area Validation ─────────────────────────────────────

describe('T-AI-002: Floor Plan Area Validation', () => {
  it('should calculate total floor area from rooms', () => {
    const plan = threeBedroomPlan();
    const result = validateFloorPlanArea(plan.rooms, plan.targetArea);
    expect(result.totalArea).toBeGreaterThan(0);
  });

  it('should pass when area is within 5% tolerance', () => {
    const rooms: Room[] = [
      { id: 'r1', name: 'Living', type: 'living', width: 10, depth: 10, x: 0, y: 0 },
    ];
    const result = validateFloorPlanArea(rooms, 100);
    expect(result.passed).toBe(true); // exactly 100m²
    expect(result.deviation).toBeCloseTo(0);
  });

  it('should fail when area exceeds 5% tolerance (too large)', () => {
    const rooms: Room[] = [
      { id: 'r1', name: 'Living', type: 'living', width: 11, depth: 11, x: 0, y: 0 },
    ];
    const result = validateFloorPlanArea(rooms, 100); // 121m² vs 100m²
    expect(result.passed).toBe(false);
    expect(result.deviation).toBeGreaterThan(5);
  });

  it('should fail when area is below 5% tolerance (too small)', () => {
    const rooms: Room[] = [
      { id: 'r1', name: 'Living', type: 'living', width: 9, depth: 9, x: 0, y: 0 },
    ];
    const result = validateFloorPlanArea(rooms, 100); // 81m² vs 100m²
    expect(result.passed).toBe(false);
    expect(result.deviation).toBeGreaterThan(5);
  });
});

// ─── T-AI-003: Room Dimension Compliance ─────────────────────────────────────

describe('T-AI-003: Room Dimension Compliance (IBC)', () => {
  it('should pass for bedroom meeting IBC minimums (3m × 2.4m)', () => {
    const rooms: Room[] = [
      { id: 'b1', name: 'Bedroom', type: 'bedroom', width: 3.5, depth: 3.0, x: 0, y: 0 },
    ];
    const violations = validateRoomDimensions(rooms);
    const bedroomViolations = violations.filter((v) => v.roomId === 'b1');
    expect(bedroomViolations.length).toBe(0);
  });

  it('should flag bedroom below IBC minimum width (< 3m)', () => {
    const rooms: Room[] = [
      { id: 'b1', name: 'Small Bedroom', type: 'bedroom', width: 2.0, depth: 3.0, x: 0, y: 0 },
    ];
    const violations = validateRoomDimensions(rooms);
    expect(violations.some((v) => v.roomId === 'b1' && v.type === 'min_dimension')).toBe(true);
  });

  it('should pass for bathroom meeting IBC minimums (1.5m × 2m)', () => {
    const rooms: Room[] = [
      { id: 'bath', name: 'Bathroom', type: 'bathroom', width: 2.0, depth: 2.5, x: 0, y: 0 },
    ];
    const violations = validateRoomDimensions(rooms);
    expect(violations.filter((v) => v.roomId === 'bath').length).toBe(0);
  });

  it('should flag bathroom below IBC minimum area', () => {
    const rooms: Room[] = [
      { id: 'bath', name: 'Tiny Bath', type: 'bathroom', width: 1.0, depth: 1.0, x: 0, y: 0 },
    ];
    const violations = validateRoomDimensions(rooms);
    expect(violations.some((v) => v.roomId === 'bath')).toBe(true);
  });

  it('should pass for kitchen meeting IBC minimums', () => {
    const rooms: Room[] = [
      { id: 'kit', name: 'Kitchen', type: 'kitchen', width: 2.5, depth: 3.0, x: 0, y: 0 },
    ];
    const violations = validateRoomDimensions(rooms);
    expect(violations.filter((v) => v.roomId === 'kit').length).toBe(0);
  });

  it('should flag kitchen below minimum clearance (< 2.4m one direction)', () => {
    const rooms: Room[] = [
      { id: 'kit', name: 'Tiny Kitchen', type: 'kitchen', width: 1.5, depth: 2.0, x: 0, y: 0 },
    ];
    const violations = validateRoomDimensions(rooms);
    expect(violations.some((v) => v.roomId === 'kit')).toBe(true);
  });
});

// ─── T-AI-004: Circulation Path Validation ───────────────────────────────────

describe('T-AI-004: Circulation Path Validation', () => {
  it('should pass when all rooms connect to hallway', () => {
    const plan = threeBedroomPlan();
    const result = validateCirculationPaths(plan.rooms, plan.connections);
    expect(result.passed).toBe(true);
    expect(result.isolatedRooms).toHaveLength(0);
  });

  it('should detect isolated room with no path to hallway', () => {
    const rooms: Room[] = [
      { id: 'hall', name: 'Hallway', type: 'hallway', width: 2, depth: 5, x: 0, y: 0 },
      { id: 'bed1', name: 'Bedroom 1', type: 'bedroom', width: 4, depth: 4, x: 2, y: 0 },
      { id: 'island', name: 'Island Room', type: 'bedroom', width: 3, depth: 3, x: 10, y: 10 },
    ];
    const connections = [{ from: 'hall', to: 'bed1' }];
    const result = validateCirculationPaths(rooms, connections);
    expect(result.passed).toBe(false);
    expect(result.isolatedRooms).toContain('island');
  });

  it('should detect room only accessible through another room', () => {
    const rooms: Room[] = [
      { id: 'hall', name: 'Hallway', type: 'hallway', width: 2, depth: 5, x: 0, y: 0 },
      { id: 'bed1', name: 'Bedroom 1', type: 'bedroom', width: 4, depth: 4, x: 2, y: 0 },
      { id: 'ensuite', name: 'Ensuite', type: 'bathroom', width: 2, depth: 2, x: 6, y: 0 },
    ];
    // ensuite only accessible through bed1
    const connections = [
      { from: 'hall', to: 'bed1' },
      { from: 'bed1', to: 'ensuite' }, // must pass through bedroom
    ];
    const result = validateCirculationPaths(rooms, connections);
    expect(result.chainedRooms).toContain('ensuite');
  });

  it('should report clear circulation for well-designed plan', () => {
    const plan = threeBedroomPlan();
    const result = validateCirculationPaths(plan.rooms, plan.connections);
    expect(result.chainedRooms.filter((r) => r !== 'ensuite')).toHaveLength(0);
  });
});

// ─── T-AI-005: Prompt Iteration ──────────────────────────────────────────────

describe('T-AI-005: Prompt Iteration — Isolated Changes', () => {
  it('should apply a single room width change without affecting others', () => {
    const plan = threeBedroomPlan();
    const change = { roomId: 'bed1', property: 'width', value: 5 };
    const updated = applyIsolatedChange(plan, change);
    const changed = updated.rooms.find((r) => r.id === 'bed1');
    const unchanged = updated.rooms.find((r) => r.id === 'bed2');
    expect(changed?.width).toBe(5);
    expect(unchanged?.width).toBe(plan.rooms.find((r) => r.id === 'bed2')?.width);
  });

  it('should not change room count when modifying a single room property', () => {
    const plan = threeBedroomPlan();
    const change = { roomId: 'kit', property: 'depth', value: 5 };
    const updated = applyIsolatedChange(plan, change);
    expect(updated.rooms.length).toBe(plan.rooms.length);
  });

  it('should update targetArea when requested', () => {
    const plan = threeBedroomPlan();
    const change = { property: 'targetArea', value: 150 };
    const updated = applyIsolatedChange(plan, change);
    expect(updated.targetArea).toBe(150);
    expect(updated.rooms.length).toBe(plan.rooms.length); // rooms unchanged
  });
});

// ─── T-AI-010: Element Modification ─────────────────────────────────────────

describe('T-AI-010: Element Modification', () => {
  it('should modify only the specified element', () => {
    const model = simpleModel();
    const updated = modifyElement(model, 'wall1', { properties: { name: 'Modified Wall' } });
    expect(updated.elements['wall1']?.properties?.['name']).toBe('Modified Wall');
    expect(updated.elements['wall2']?.properties?.['name']).toBe('Wall 2'); // unchanged
  });

  it('should leave unrelated elements unchanged', () => {
    const model = simpleModel();
    const elementCountBefore = Object.keys(model.elements).length;
    const updated = modifyElement(model, 'door1', { properties: { name: 'Side Door' } });
    expect(Object.keys(updated.elements).length).toBe(elementCountBefore);
    expect(updated.elements['wall1']).toEqual(model.elements['wall1']);
  });

  it('should return unchanged model for non-existent element id', () => {
    const model = simpleModel();
    const updated = modifyElement(model, 'nonexistent', { properties: { name: 'X' } });
    expect(updated).toEqual(model);
  });
});

// ─── T-AI-011: Model Validity After AI ───────────────────────────────────────

describe('T-AI-011: Model Validity After AI Modification', () => {
  it('should detect wall overlap', () => {
    const model: ModelDocument = {
      elements: {
        wall1: { id: 'wall1', type: 'wall', bbox: { x: 0, y: 0, w: 10, h: 0.3 }, properties: {} },
        wall2: { id: 'wall2', type: 'wall', bbox: { x: 5, y: 0, w: 10, h: 0.3 }, properties: {} },
      },
      history: [],
    };
    const issues = validateModelIntegrity(model);
    expect(issues.some((i) => i.type === 'overlap')).toBe(true);
  });

  it('should pass when walls do not overlap', () => {
    const issues = validateModelIntegrity(simpleModel());
    expect(issues.filter((i) => i.type === 'overlap')).toHaveLength(0);
  });

  it('should detect door not in a wall (geometry mismatch)', () => {
    const model: ModelDocument = {
      elements: {
        wall1: { id: 'wall1', type: 'wall', bbox: { x: 0, y: 0, w: 5, h: 0.3 }, properties: {} },
        // door placed outside wall bounds
        door1: {
          id: 'door1',
          type: 'door',
          bbox: { x: 10, y: 0, w: 1, h: 0.3 },
          properties: { hostWall: 'wall1' },
        },
      },
      history: [],
    };
    const issues = validateModelIntegrity(model);
    expect(issues.some((i) => i.type === 'door_outside_wall')).toBe(true);
  });

  it('should not report issues for valid model', () => {
    const issues = validateModelIntegrity(simpleModel());
    expect(issues.length).toBe(0);
  });
});

// ─── T-AI-012: AI Undo Functionality ─────────────────────────────────────────

describe('T-AI-012: AI Undo Functionality', () => {
  it('should create a snapshot of current state', () => {
    const model = simpleModel();
    const snapshot = createUndoSnapshot(model);
    expect(snapshot).toBeDefined();
    expect(snapshot.elements['wall1']).toBeDefined();
  });

  it('should restore a previous snapshot completely', () => {
    const model = simpleModel();
    const snapshot = createUndoSnapshot(model);

    const modified = modifyElement(model, 'wall1', { properties: { name: 'Changed' } });
    expect(modified.elements['wall1']?.properties?.['name']).toBe('Changed');

    const restored = restoreSnapshot(modified, snapshot);
    expect(restored.elements['wall1']?.properties?.['name']).toBe('Wall 1');
  });

  it('should not share references with original after restore', () => {
    const model = simpleModel();
    const snapshot = createUndoSnapshot(model);
    const restored = restoreSnapshot(model, snapshot);
    // Deep clone — mutations should not affect each other
    restored.elements['wall1']!.properties!['name'] = 'Mutated';
    expect(snapshot.elements['wall1']?.properties?.['name']).toBe('Wall 1');
  });

  it('should preserve undo history intact after modification', () => {
    const model = simpleModel();
    const snapshot1 = createUndoSnapshot(model);
    const modified = modifyElement(model, 'wall1', { properties: { name: 'V2' } });
    const snapshot2 = createUndoSnapshot(modified);

    const v1 = restoreSnapshot(modified, snapshot1);
    const v2 = restoreSnapshot(v1, snapshot2);

    expect(v1.elements['wall1']?.properties?.['name']).toBe('Wall 1');
    expect(v2.elements['wall1']?.properties?.['name']).toBe('V2');
  });
});

// ─── T-AI-020: Code Compliance Detection ─────────────────────────────────────

describe('T-AI-020: Code Compliance Detection (IBC)', () => {
  it('should detect all violations — no false negatives', () => {
    const rooms: Room[] = [
      // undersized bedroom
      { id: 'b1', name: 'Small Bed', type: 'bedroom', width: 1.5, depth: 2.0, x: 0, y: 0 },
      // tiny bathroom
      { id: 'bath', name: 'Tiny Bath', type: 'bathroom', width: 0.8, depth: 0.8, x: 2, y: 0 },
      // small kitchen
      { id: 'kit', name: 'Mini Kitchen', type: 'kitchen', width: 1.0, depth: 1.5, x: 3, y: 0 },
    ];
    const violations = runIBCCompliance(rooms);
    // All three rooms should have violations
    const violatedIds = new Set(violations.map((v) => v.roomId));
    expect(violatedIds.has('b1')).toBe(true);
    expect(violatedIds.has('bath')).toBe(true);
    expect(violatedIds.has('kit')).toBe(true);
  });

  it('should return empty violations for compliant plan', () => {
    const rooms: Room[] = [
      { id: 'b1', name: 'Bedroom', type: 'bedroom', width: 4, depth: 4, x: 0, y: 0 },
      { id: 'bath', name: 'Bathroom', type: 'bathroom', width: 2.5, depth: 3.0, x: 4, y: 0 },
      { id: 'kit', name: 'Kitchen', type: 'kitchen', width: 3, depth: 4, x: 7, y: 0 },
    ];
    const violations = runIBCCompliance(rooms);
    expect(violations.length).toBe(0);
  });
});

// ─── T-AI-021: Code Compliance False Positives ────────────────────────────────

describe('T-AI-021: Code Compliance False Positives', () => {
  it('should not flag compliant bedrooms as violations', () => {
    const rooms: Room[] = [
      { id: 'b1', name: 'Master', type: 'bedroom', width: 4, depth: 5, x: 0, y: 0 },
      { id: 'b2', name: 'Guest', type: 'bedroom', width: 3.5, depth: 3.5, x: 4, y: 0 },
    ];
    const violations = runIBCCompliance(rooms);
    expect(violations.filter((v) => v.roomId === 'b1' || v.roomId === 'b2').length).toBe(0);
  });

  it('should not flag hallways for dimension rules', () => {
    const rooms: Room[] = [
      { id: 'hall', name: 'Hallway', type: 'hallway', width: 1.2, depth: 5, x: 0, y: 0 },
    ];
    // Hallways have different rules (width ≥ 0.9m per IBC)
    const violations = runIBCCompliance(rooms);
    expect(violations.filter((v) => v.roomId === 'hall').length).toBe(0);
  });
});

// ─── T-AI-022: Code Citation ──────────────────────────────────────────────────

describe('T-AI-022: Code Citation', () => {
  it('should return IBC citation for bedroom dimension rule', () => {
    const citation = getCitationForRule('min_bedroom_dimension');
    expect(citation).toContain('IBC');
    expect(citation.length).toBeGreaterThan(5);
  });

  it('should return citation for bathroom rule', () => {
    const citation = getCitationForRule('min_bathroom_area');
    expect(citation).toContain('IBC');
  });

  it('should return a reference string for any known rule', () => {
    const rules = ['min_bedroom_dimension', 'min_bathroom_area', 'min_kitchen_clearance'];
    for (const rule of rules) {
      const citation = getCitationForRule(rule);
      expect(typeof citation).toBe('string');
      expect(citation.length).toBeGreaterThan(0);
    }
  });

  it('should return unknown for unrecognized rule', () => {
    const citation = getCitationForRule('nonexistent_rule_xyz');
    expect(citation.toLowerCase()).toContain('unknown');
  });
});

// ─── T-AI-023: AI Suggested Fix ──────────────────────────────────────────────

describe('T-AI-023: AI Suggested Fix', () => {
  it('should suggest fix for undersized bedroom', () => {
    const violation: ComplianceViolation = {
      roomId: 'b1',
      type: 'min_dimension',
      rule: 'min_bedroom_dimension',
      severity: 'error',
      message: 'Bedroom width below IBC minimum of 3m',
      suggestedMinWidth: 3,
      suggestedMinDepth: 2.4,
    };
    const fix = suggestFix(violation);
    expect(fix).toBeDefined();
    expect(fix.action).toBe('resize');
    expect(fix.newWidth).toBeGreaterThanOrEqual(3);
  });

  it('should suggest fix for undersized bathroom', () => {
    const violation: ComplianceViolation = {
      roomId: 'bath',
      type: 'min_area',
      rule: 'min_bathroom_area',
      severity: 'error',
      message: 'Bathroom below minimum 4.5m²',
      suggestedMinWidth: 1.5,
      suggestedMinDepth: 3.0,
    };
    const fix = suggestFix(violation);
    expect(fix.action).toBe('resize');
    expect(fix.newWidth).toBeGreaterThanOrEqual(1.5);
    expect(fix.newDepth).toBeGreaterThanOrEqual(3.0);
  });
});

// ─── T-AI-024: Offline Code Compliance ───────────────────────────────────────

describe('T-AI-024: Offline Code Compliance', () => {
  it('should run compliance without network (deterministic rules)', () => {
    const rooms: Room[] = [
      { id: 'b1', name: 'Bedroom', type: 'bedroom', width: 1, depth: 1, x: 0, y: 0 },
    ];
    // runOfflineCompliance uses local rule engine, no fetch
    const violations = runOfflineCompliance(rooms);
    expect(Array.isArray(violations)).toBe(true);
    expect(violations.some((v) => v.roomId === 'b1')).toBe(true);
  });

  it('should produce same results as online IBC check', () => {
    const rooms: Room[] = [
      { id: 'b1', name: 'Bedroom', type: 'bedroom', width: 4, depth: 4, x: 0, y: 0 },
    ];
    const online = runIBCCompliance(rooms);
    const offline = runOfflineCompliance(rooms);
    expect(offline).toEqual(online);
  });

  it('should be synchronous (no async needed)', () => {
    const rooms: Room[] = [
      { id: 'b1', name: 'Bedroom', type: 'bedroom', width: 2, depth: 2, x: 0, y: 0 },
    ];
    // Verify synchronous — no promise returned
    const result = runOfflineCompliance(rooms);
    expect(result).not.toBeInstanceOf(Promise);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── BIM Element Validation Fixtures ─────────────────────────────────────────

type PropValue = { type: 'string' | 'number' | 'boolean' | 'enum' | 'reference'; value: string | number | boolean | string[] };

function makeTestDoc(elements: Record<string, ReturnType<typeof makeTestWall>> = {}) {
  return {
    organization: {
      layers: {
        'layer-walls': { name: 'Walls', locked: false },
        'layer-locked': { name: 'Locked Layer', locked: true },
      },
    },
    content: { elements },
  };
}

function makeTestWall(id: string, heightMm: number, layerId = 'layer-walls', extraProps: Record<string, PropValue> = {}) {
  return {
    id,
    type: 'wall' as const,
    layerId,
    properties: {
      Height: { type: 'number' as const, value: heightMm },
      StartX: { type: 'number' as const, value: 0 },
      StartY: { type: 'number' as const, value: 0 },
      EndX: { type: 'number' as const, value: 5000 },
      EndY: { type: 'number' as const, value: 0 },
      ...extraProps,
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 5000, y: 200, z: heightMm },
    },
  };
}

function makeTestDoor(id: string, x: number, y: number, w: number, h: number, layerId = 'layer-walls') {
  return {
    id,
    type: 'door' as const,
    layerId,
    properties: {} as Record<string, PropValue>,
    boundingBox: {
      min: { x, y, z: 0 },
      max: { x: x + w, y: y + h, z: 2100 },
    },
  };
}

function makeTestBeam(id: string, hasStartEnd: boolean, layerId = 'layer-walls') {
  const props: Record<string, PropValue> = hasStartEnd
    ? {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 5000 },
        EndY: { type: 'number', value: 0 },
      }
    : {};
  return {
    id,
    type: 'beam' as const,
    layerId,
    properties: props,
    boundingBox: {
      min: { x: 0, y: 0, z: 2500 },
      max: { x: 5000, y: 200, z: 2800 },
    },
  };
}

// ─── T-AI-005: Wall with height=0 fails validation ──────────────────────────��─

describe('T-AI-005: Wall height=0 fails BIM validation', () => {
  it('should return valid=false for a wall with height=0', () => {
    const wall = makeTestWall('wall-zero', 0);
    const doc = makeTestDoc();
    const result: ValidationResult = validateElement(wall, doc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.toLowerCase().includes('height'))).toBe(true);
  });

  it('should return valid=false for a wall with negative height', () => {
    const wall = makeTestWall('wall-neg', -100);
    const doc = makeTestDoc();
    const result = validateElement(wall, doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('height'))).toBe(true);
  });

  it('should return no height errors for a wall with positive height', () => {
    const wall = makeTestWall('wall-ok', 3000);
    const doc = makeTestDoc();
    const result = validateElement(wall, doc);
    expect(result.errors.filter((e) => e.toLowerCase().includes('height'))).toHaveLength(0);
  });
});

// ─── T-AI-006: Door outside any wall gets a warning ──────────────────────────

describe('T-AI-006: Door outside any wall gets a warning', () => {
  it('should warn when a door is not within any wall bounding box', () => {
    const doorFar = makeTestDoor('door-far', 10000, 10000, 900, 200);
    const doc = makeTestDoc({ 'wall-1': makeTestWall('wall-1', 3000) });
    const result = validateElement(doorFar, doc);
    expect(result.warnings.some((w) => w.toLowerCase().includes('wall'))).toBe(true);
  });

  it('should not warn when door is contained within a wall bounding box', () => {
    // Wall bbox: x:[0..5000], y:[0..200], z:[0..3000]
    // Door must be fully inside: x:[500..1400], y:[0..200]
    const door = makeTestDoor('door-in', 500, 0, 900, 200);
    const wall = makeTestWall('wall-1', 3000);
    const doc = makeTestDoc({ 'wall-1': wall });
    const result = validateElement(door, doc);
    expect(result.warnings.filter((w) => w.toLowerCase().includes('wall'))).toHaveLength(0);
  });

  it('should warn when no walls exist in the document', () => {
    const door = makeTestDoor('door-1', 0, 0, 900, 200);
    const doc = makeTestDoc(); // no walls
    const result = validateElement(door, doc);
    expect(result.warnings.some((w) => w.toLowerCase().includes('wall'))).toBe(true);
  });
});

// ─── T-AI-007: Valid wall passes all checks ───────────────────────────────────

describe('T-AI-007: Valid wall passes all BIM checks', () => {
  it('should return valid=true and no errors for a well-formed wall', () => {
    const wall = makeTestWall('wall-good', 3000);
    const doc = makeTestDoc();
    const result = validateElement(wall, doc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should produce no errors and no warnings for a standard unlocked wall', () => {
    const wall = makeTestWall('wall-good', 2700);
    const doc = makeTestDoc();
    const result = validateElement(wall, doc);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('ValidationResult type has valid, errors, and warnings fields', () => {
    const wall = makeTestWall('w1', 3000);
    const doc = makeTestDoc();
    const result = validateElement(wall, doc);
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ─── Additional BIM validation rules ─────────────────────────────────────────

describe('BIM validation: locked layer warning', () => {
  it('should warn when an element is placed on a locked layer', () => {
    const wall = makeTestWall('wall-locked', 3000, 'layer-locked');
    const doc = makeTestDoc();
    const result = validateElement(wall, doc);
    expect(result.warnings.some((w) => w.toLowerCase().includes('lock'))).toBe(true);
  });

  it('should not warn for an element on an unlocked layer', () => {
    const wall = makeTestWall('wall-unlocked', 3000, 'layer-walls');
    const doc = makeTestDoc();
    const result = validateElement(wall, doc);
    expect(result.warnings.filter((w) => w.toLowerCase().includes('lock'))).toHaveLength(0);
  });
});

describe('BIM validation: overlapping elements of same type', () => {
  it('should warn when two walls of same type overlap on same layer', () => {
    const wall1 = makeTestWall('w1', 3000, 'layer-walls');
    const wall2 = makeTestWall('w2', 3000, 'layer-walls'); // same bbox
    const doc = makeTestDoc({ w1: wall1, w2: wall2 });
    const result = validateElement(wall1, doc);
    expect(result.warnings.some((w) => w.toLowerCase().includes('overlap'))).toBe(true);
  });

  it('should not warn when walls are on different layers', () => {
    const wall1 = makeTestWall('w1', 3000, 'layer-walls');
    const wall2 = makeTestWall('w2', 3000, 'layer-locked');
    const doc = makeTestDoc({ w1: wall1, w2: wall2 });
    const result = validateElement(wall1, doc);
    expect(result.warnings.filter((w) => w.toLowerCase().includes('overlap'))).toHaveLength(0);
  });
});

describe('BIM validation: beam must have start/end points', () => {
  it('should error when beam has no start/end point properties', () => {
    const beam = makeTestBeam('beam-1', false);
    const doc = makeTestDoc();
    const result = validateElement(beam, doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.toLowerCase().includes('start') || e.toLowerCase().includes('end') || e.toLowerCase().includes('span')
    )).toBe(true);
  });

  it('should pass when beam has start and end point properties', () => {
    const beam = makeTestBeam('beam-ok', true);
    const doc = makeTestDoc();
    const result = validateElement(beam, doc);
    expect(result.errors.filter((e) =>
      e.toLowerCase().includes('span') ||
      (e.toLowerCase().includes('start') && e.toLowerCase().includes('end'))
    )).toHaveLength(0);
  });
});
