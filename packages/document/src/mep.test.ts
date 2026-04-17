/**
 * MEP Element Tests
 * T-MEP-001: Duct creation, cross-section, volume
 * T-MEP-002: Pipe creation, inner diameter, flow area
 * T-MEP-003: Conduit creation, trade sizes
 * T-MEP-004: Cable tray creation
 * T-MEP-005: Mechanical equipment
 * T-MEP-006: MEP systems (grouping)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createDuct,
  ductCrossSection,
  ductVolume,
  createDuctFitting,
  createPipe,
  pipeInnerDiameter,
  pipeFlowArea,
  createPipeFitting,
  createConduit,
  createCableTray,
  createMechanicalEquipment,
  createMEPSystem,
  addElementToSystem,
} from './mep';

// ─── T-MEP-001: Duct ──────────────────────────────────────────────────────────

describe('T-MEP-001: Duct creation and geometry', () => {
  it('should create a rectangular duct with correct dimensions', () => {
    const duct = createDuct({ shape: 'rectangular', width: 600, height: 400, length: 3000 });
    expect(duct.type).toBe('duct');
    expect(duct.shape).toBe('rectangular');
    expect(duct.width).toBe(600);
    expect(duct.height).toBe(400);
    expect(duct.length).toBe(3000);
  });

  it('should compute rectangular duct cross-section = width × height', () => {
    const duct = createDuct({ shape: 'rectangular', width: 600, height: 400, length: 3000 });
    expect(ductCrossSection(duct)).toBeCloseTo(240000, 0);
  });

  it('should compute round duct cross-section = π × r²', () => {
    const duct = createDuct({ shape: 'round', diameter: 400, length: 2000 });
    expect(ductCrossSection(duct)).toBeCloseTo(Math.PI * 200 * 200, 0);
  });

  it('should compute duct volume = cross-section × length', () => {
    const duct = createDuct({ shape: 'rectangular', width: 600, height: 400, length: 3000 });
    const expected = 600 * 400 * 3000;
    expect(ductVolume(duct)).toBeCloseTo(expected, 0);
  });

  it('should default to supply flow direction', () => {
    const duct = createDuct({ length: 2000 });
    expect(duct.flowDirection).toBe('supply');
  });

  it('should create duct with explicit flow direction', () => {
    const duct = createDuct({ length: 2000, flowDirection: 'return' });
    expect(duct.flowDirection).toBe('return');
  });

  it('should assign unique IDs to each duct', () => {
    const d1 = createDuct({ length: 1000 });
    const d2 = createDuct({ length: 1000 });
    expect(d1.id).not.toBe(d2.id);
  });

  it('should create insulated duct', () => {
    const duct = createDuct({ length: 3000, insulated: true, insulationThickness: 50 });
    expect(duct.insulated).toBe(true);
    expect(duct.insulationThickness).toBe(50);
  });

  // Property-based: volume = cross-section × length for rectangular ducts
  it('rectangular duct volume = width × height × length (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 500, max: 10000 }),
        (w, h, l) => {
          const duct = createDuct({ shape: 'rectangular', width: w, height: h, length: l });
          const vol = ductVolume(duct);
          return Math.abs(vol - w * h * l) < 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── T-MEP-001b: Duct Fittings ────────────────────────────────────────────────

describe('T-MEP-001b: Duct fittings', () => {
  it('should create an elbow fitting', () => {
    const fitting = createDuctFitting({ fittingType: 'elbow', angle: 90 });
    expect(fitting.type).toBe('duct_fitting');
    expect(fitting.fittingType).toBe('elbow');
    expect(fitting.angle).toBe(90);
  });

  it('should create a tee fitting', () => {
    const fitting = createDuctFitting({ fittingType: 'tee' });
    expect(fitting.fittingType).toBe('tee');
    expect(fitting.inletWidth).toBeDefined();
  });

  it('should create a reducer with different inlet and outlet', () => {
    const fitting = createDuctFitting({
      fittingType: 'reducer',
      inletWidth: 600,
      inletHeight: 400,
      outletWidth: 400,
      outletHeight: 300,
    });
    expect(fitting.inletWidth).toBe(600);
    expect(fitting.outletWidth).toBe(400);
  });
});

// ─── T-MEP-002: Pipe ──────────────────────────────────────────────────────────

describe('T-MEP-002: Pipe creation and geometry', () => {
  it('should create a pipe with correct nominal diameter', () => {
    const pipe = createPipe({ nominalDiameter: 50, length: 3000 });
    expect(pipe.type).toBe('pipe');
    expect(pipe.nominalDiameter).toBe(50);
    expect(pipe.length).toBe(3000);
  });

  it('should compute inner diameter = outer - 2 × wall thickness', () => {
    const pipe = createPipe({ nominalDiameter: 50, outerDiameter: 60, wallThickness: 3, length: 1000 });
    expect(pipeInnerDiameter(pipe)).toBeCloseTo(54, 5);
  });

  it('should compute pipe flow area = π × (inner_radius)²', () => {
    const pipe = createPipe({ nominalDiameter: 50, outerDiameter: 60, wallThickness: 3, length: 1000 });
    const innerD = 54;
    const expected = Math.PI * (innerD / 2) ** 2;
    expect(pipeFlowArea(pipe)).toBeCloseTo(expected, 0);
  });

  it('should default to domestic cold water system', () => {
    const pipe = createPipe({ length: 2000 });
    expect(pipe.system).toBe('domestic_cold');
  });

  it('should create pipe for fire suppression', () => {
    const pipe = createPipe({ nominalDiameter: 100, length: 5000, system: 'fire_suppression' });
    expect(pipe.system).toBe('fire_suppression');
  });

  it('should create pipe with slope for gravity system', () => {
    const pipe = createPipe({ nominalDiameter: 100, length: 5000, system: 'sanitary', slope: 2 });
    expect(pipe.slope).toBe(2);
  });

  // Property-based: inner diameter always less than outer diameter
  it('inner diameter < outer diameter (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 1, max: 20 }),  // wall percent (1–20% of OD)
        (nd, wallPercent) => {
          const od = nd * 1.1;
          const wt = od * (wallPercent / 100);
          const pipe = createPipe({ nominalDiameter: nd, outerDiameter: od, wallThickness: wt, length: 1000 });
          return pipeInnerDiameter(pipe) < pipe.outerDiameter;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── T-MEP-002b: Pipe Fittings ────────────────────────────────────────────────

describe('T-MEP-002b: Pipe fittings', () => {
  it('should create a 90° elbow', () => {
    const fitting = createPipeFitting({ fittingType: 'elbow_90', nominalDiameter: 50 });
    expect(fitting.type).toBe('pipe_fitting');
    expect(fitting.fittingType).toBe('elbow_90');
    expect(fitting.nominalDiameter).toBe(50);
  });

  it('should create a valve', () => {
    const fitting = createPipeFitting({ fittingType: 'valve', nominalDiameter: 25 });
    expect(fitting.fittingType).toBe('valve');
  });

  it('should assign system type', () => {
    const fitting = createPipeFitting({ fittingType: 'tee', system: 'heating_hot' });
    expect(fitting.system).toBe('heating_hot');
  });
});

// ─── T-MEP-003: Conduit ───────────────────────────────────────────────────────

describe('T-MEP-003: Conduit creation', () => {
  it('should create EMT conduit', () => {
    const conduit = createConduit({ conduitType: 'EMT', tradeSize: 0.75, length: 3000 });
    expect(conduit.type).toBe('conduit');
    expect(conduit.conduitType).toBe('EMT');
    expect(conduit.tradeSize).toBe(0.75);
  });

  it('outer diameter > inner diameter', () => {
    const conduit = createConduit({ tradeSize: 1.0, length: 3000 });
    expect(conduit.outerDiameter).toBeGreaterThan(conduit.innerDiameter);
  });

  it('should track fill percentage', () => {
    const conduit = createConduit({ tradeSize: 1.0, length: 3000, fill: 40 });
    expect(conduit.fill).toBe(40);
  });

  it('fill defaults to 0', () => {
    const conduit = createConduit({ length: 2000 });
    expect(conduit.fill).toBe(0);
  });
});

// ─── T-MEP-004: Cable Tray ────────────────────────────────────────────────────

describe('T-MEP-004: Cable tray creation', () => {
  it('should create a ladder cable tray', () => {
    const tray = createCableTray({ width: 600, depth: 100, length: 3000, style: 'ladder' });
    expect(tray.type).toBe('cable_tray');
    expect(tray.style).toBe('ladder');
    expect(tray.width).toBe(600);
  });

  it('should default to galvanized steel', () => {
    const tray = createCableTray({ length: 3000 });
    expect(tray.material).toBe('Galvanized Steel');
  });

  it('should track fill percentage', () => {
    const tray = createCableTray({ length: 3000, fill: 60 });
    expect(tray.fill).toBe(60);
  });
});

// ─── T-MEP-005: Mechanical Equipment ─────────────────────────────────────────

describe('T-MEP-005: Mechanical equipment', () => {
  it('should create an air handling unit', () => {
    const ahu = createMechanicalEquipment({
      equipmentType: 'AHU',
      width: 2000,
      depth: 1500,
      height: 1800,
      capacity: 5000,
      capacityUnit: 'CFM',
    });
    expect(ahu.type).toBe('mechanical_equipment');
    expect(ahu.equipmentType).toBe('AHU');
    expect(ahu.capacity).toBe(5000);
    expect(ahu.capacityUnit).toBe('CFM');
  });

  it('should create a chiller with 3-phase power', () => {
    const chiller = createMechanicalEquipment({
      equipmentType: 'Chiller',
      capacity: 100,
      capacityUnit: 'kW',
      voltage: 415,
      phase: 3,
    });
    expect(chiller.phase).toBe(3);
    expect(chiller.voltage).toBe(415);
  });

  it('should create a pump', () => {
    const pump = createMechanicalEquipment({ equipmentType: 'Pump' });
    expect(pump.equipmentType).toBe('Pump');
    expect(pump.id).toBeDefined();
  });
});

// ─── T-MEP-006: MEP Systems ───────────────────────────────────────────────────

describe('T-MEP-006: MEP system management', () => {
  it('should create an HVAC system', () => {
    const system = createMEPSystem({ name: 'HVAC-01', type: 'mechanical' });
    expect(system.type).toBe('mechanical');
    expect(system.name).toBe('HVAC-01');
    expect(system.elements).toHaveLength(0);
  });

  it('should add elements to a system', () => {
    let system = createMEPSystem({ name: 'Plumbing-01', type: 'plumbing' });
    const duct1 = createDuct({ length: 2000 });
    const duct2 = createDuct({ length: 1500 });
    system = addElementToSystem(system, duct1.id);
    system = addElementToSystem(system, duct2.id);
    expect(system.elements).toHaveLength(2);
    expect(system.elements).toContain(duct1.id);
    expect(system.elements).toContain(duct2.id);
  });

  it('should create electrical system', () => {
    const system = createMEPSystem({ name: 'Electrical-01', type: 'electrical' });
    expect(system.type).toBe('electrical');
  });
});
