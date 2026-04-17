/**
 * MEP (Mechanical, Electrical, Plumbing) Elements
 *
 * Provides typed creation functions for ductwork, piping, conduit,
 * cable trays, and equipment elements used in BIM workflows.
 */

// ─── Duct ─────────────────────────────────────────────────────────────────────

export type DuctShape = 'rectangular' | 'round' | 'oval';
export type FlowDirection = 'supply' | 'return' | 'exhaust' | 'outside_air';

export interface DuctSchema {
  id: string;
  type: 'duct';
  shape: DuctShape;
  width: number;          // mm (rectangular/oval)
  height: number;         // mm (rectangular/oval)
  diameter: number;       // mm (round)
  thickness: number;      // mm wall thickness
  length: number;         // mm
  flowDirection: FlowDirection;
  systemName: string;
  elevation: number;      // mm bottom of duct from level
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  material: string;
  insulated: boolean;
  insulationThickness: number;
}

export interface CreateDuctParams {
  shape?: DuctShape;
  width?: number;
  height?: number;
  diameter?: number;
  thickness?: number;
  length: number;
  flowDirection?: FlowDirection;
  systemName?: string;
  elevation?: number;
  startPoint?: { x: number; y: number; z: number };
  endPoint?: { x: number; y: number; z: number };
  material?: string;
  insulated?: boolean;
  insulationThickness?: number;
}

export function createDuct(params: CreateDuctParams): DuctSchema {
  const shape = params.shape ?? 'rectangular';
  const start = params.startPoint ?? { x: 0, y: 0, z: 0 };
  const end = params.endPoint ?? { x: params.length, y: 0, z: 0 };

  return {
    id: crypto.randomUUID(),
    type: 'duct',
    shape,
    width: params.width ?? 400,
    height: params.height ?? 300,
    diameter: params.diameter ?? 400,
    thickness: params.thickness ?? 1,
    length: params.length,
    flowDirection: params.flowDirection ?? 'supply',
    systemName: params.systemName ?? 'HVAC-01',
    elevation: params.elevation ?? 2700,
    startPoint: start,
    endPoint: end,
    material: params.material ?? 'Galvanized Steel',
    insulated: params.insulated ?? false,
    insulationThickness: params.insulationThickness ?? 0,
  };
}

export function ductCrossSection(duct: DuctSchema): number {
  if (duct.shape === 'round') {
    return Math.PI * (duct.diameter / 2) ** 2;
  } else if (duct.shape === 'rectangular') {
    return duct.width * duct.height;
  } else {
    // oval: approximate as ellipse
    return Math.PI * (duct.width / 2) * (duct.height / 2);
  }
}

export function ductVolume(duct: DuctSchema): number {
  return ductCrossSection(duct) * duct.length;
}

// ─── Duct Fitting ─────────────────────────────────────────────────────────────

export type DuctFittingType = 'elbow' | 'tee' | 'cross' | 'reducer' | 'cap' | 'transition';

export interface DuctFittingSchema {
  id: string;
  type: 'duct_fitting';
  fittingType: DuctFittingType;
  angle?: number;         // degrees (for elbows)
  inletWidth: number;
  inletHeight: number;
  outletWidth: number;
  outletHeight: number;
  systemName: string;
}

export function createDuctFitting(params: {
  fittingType: DuctFittingType;
  angle?: number;
  inletWidth?: number;
  inletHeight?: number;
  outletWidth?: number;
  outletHeight?: number;
  systemName?: string;
}): DuctFittingSchema {
  return {
    id: crypto.randomUUID(),
    type: 'duct_fitting',
    fittingType: params.fittingType,
    angle: params.angle,
    inletWidth: params.inletWidth ?? 400,
    inletHeight: params.inletHeight ?? 300,
    outletWidth: params.outletWidth ?? params.inletWidth ?? 400,
    outletHeight: params.outletHeight ?? params.inletHeight ?? 300,
    systemName: params.systemName ?? 'HVAC-01',
  };
}

// ─── Pipe ─────────────────────────────────────────────────────────────────────

export type PipeSystem = 'domestic_hot' | 'domestic_cold' | 'chilled_water' | 'heating_hot' | 'fire_suppression' | 'sanitary' | 'storm' | 'gas';

export interface PipeSchema {
  id: string;
  type: 'pipe';
  nominalDiameter: number;   // mm (NPS or DN)
  outerDiameter: number;     // mm
  wallThickness: number;     // mm
  length: number;            // mm
  system: PipeSystem;
  material: string;
  schedule: string;          // e.g., 'SCH40', 'SCH80'
  insulated: boolean;
  insulationThickness: number;
  slope: number;             // mm/m (for gravity systems)
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export function createPipe(params: {
  nominalDiameter?: number;
  outerDiameter?: number;
  wallThickness?: number;
  length: number;
  system?: PipeSystem;
  material?: string;
  schedule?: string;
  insulated?: boolean;
  insulationThickness?: number;
  slope?: number;
  startPoint?: { x: number; y: number; z: number };
  endPoint?: { x: number; y: number; z: number };
}): PipeSchema {
  const nd = params.nominalDiameter ?? 50;
  const od = params.outerDiameter ?? nd * 1.05;
  return {
    id: crypto.randomUUID(),
    type: 'pipe',
    nominalDiameter: nd,
    outerDiameter: od,
    wallThickness: params.wallThickness ?? od * 0.05,
    length: params.length,
    system: params.system ?? 'domestic_cold',
    material: params.material ?? 'Copper',
    schedule: params.schedule ?? 'Type L',
    insulated: params.insulated ?? false,
    insulationThickness: params.insulationThickness ?? 0,
    slope: params.slope ?? 0,
    startPoint: params.startPoint ?? { x: 0, y: 0, z: 0 },
    endPoint: params.endPoint ?? { x: params.length, y: 0, z: 0 },
  };
}

export function pipeInnerDiameter(pipe: PipeSchema): number {
  return pipe.outerDiameter - 2 * pipe.wallThickness;
}

export function pipeFlowArea(pipe: PipeSchema): number {
  const r = pipeInnerDiameter(pipe) / 2;
  return Math.PI * r * r;
}

// ─── Pipe Fitting ─────────────────────────────────────────────────────────────

export type PipeFittingType = 'elbow_90' | 'elbow_45' | 'tee' | 'cross' | 'reducer' | 'union' | 'valve' | 'cap';

export interface PipeFittingSchema {
  id: string;
  type: 'pipe_fitting';
  fittingType: PipeFittingType;
  nominalDiameter: number;
  material: string;
  system: PipeSystem;
}

export function createPipeFitting(params: {
  fittingType: PipeFittingType;
  nominalDiameter?: number;
  material?: string;
  system?: PipeSystem;
}): PipeFittingSchema {
  return {
    id: crypto.randomUUID(),
    type: 'pipe_fitting',
    fittingType: params.fittingType,
    nominalDiameter: params.nominalDiameter ?? 50,
    material: params.material ?? 'Copper',
    system: params.system ?? 'domestic_cold',
  };
}

// ─── Conduit ──────────────────────────────────────────────────────────────────

export type ConduitType = 'EMT' | 'IMC' | 'RMC' | 'FMC' | 'PVC' | 'LFMC';

export interface ConduitSchema {
  id: string;
  type: 'conduit';
  conduitType: ConduitType;
  tradeSize: number;          // inches trade size (0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4)
  outerDiameter: number;      // mm
  innerDiameter: number;      // mm
  length: number;             // mm
  material: string;
  fill: number;               // percent fill (0-100)
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export function createConduit(params: {
  conduitType?: ConduitType;
  tradeSize?: number;
  length: number;
  fill?: number;
  startPoint?: { x: number; y: number; z: number };
  endPoint?: { x: number; y: number; z: number };
}): ConduitSchema {
  const tradeSize = params.tradeSize ?? 0.75;
  // Approximate EMT dimensions from trade size
  const outerDiameter = tradeSize * 25.4 * 1.3;
  const innerDiameter = outerDiameter * 0.87;
  return {
    id: crypto.randomUUID(),
    type: 'conduit',
    conduitType: params.conduitType ?? 'EMT',
    tradeSize,
    outerDiameter,
    innerDiameter,
    length: params.length,
    material: 'Steel',
    fill: params.fill ?? 0,
    startPoint: params.startPoint ?? { x: 0, y: 0, z: 0 },
    endPoint: params.endPoint ?? { x: params.length, y: 0, z: 0 },
  };
}

// ─── Cable Tray ───────────────────────────────────────────────────────────────

export interface CableTraySchema {
  id: string;
  type: 'cable_tray';
  width: number;
  depth: number;
  length: number;
  material: string;
  style: 'ladder' | 'solid_bottom' | 'ventilated' | 'wire_mesh';
  fill: number;   // percent fill (0-100)
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export function createCableTray(params: {
  width?: number;
  depth?: number;
  length: number;
  material?: string;
  style?: CableTraySchema['style'];
  fill?: number;
  startPoint?: { x: number; y: number; z: number };
  endPoint?: { x: number; y: number; z: number };
}): CableTraySchema {
  return {
    id: crypto.randomUUID(),
    type: 'cable_tray',
    width: params.width ?? 300,
    depth: params.depth ?? 100,
    length: params.length,
    material: params.material ?? 'Galvanized Steel',
    style: params.style ?? 'ladder',
    fill: params.fill ?? 0,
    startPoint: params.startPoint ?? { x: 0, y: 0, z: 0 },
    endPoint: params.endPoint ?? { x: params.length, y: 0, z: 0 },
  };
}

// ─── Mechanical Equipment ─────────────────────────────────────────────────────

export interface MechanicalEquipmentSchema {
  id: string;
  type: 'mechanical_equipment';
  equipmentType: string;     // e.g., 'AHU', 'FCU', 'Chiller', 'Boiler', 'Pump'
  width: number;
  depth: number;
  height: number;
  weight: number;            // kg
  capacity: number;          // kW or CFM depending on type
  capacityUnit: string;
  voltage: number;
  phase: 1 | 3;
  position: { x: number; y: number; z: number };
}

export function createMechanicalEquipment(params: {
  equipmentType: string;
  width?: number;
  depth?: number;
  height?: number;
  weight?: number;
  capacity?: number;
  capacityUnit?: string;
  voltage?: number;
  phase?: 1 | 3;
  position?: { x: number; y: number; z: number };
}): MechanicalEquipmentSchema {
  return {
    id: crypto.randomUUID(),
    type: 'mechanical_equipment',
    equipmentType: params.equipmentType,
    width: params.width ?? 1000,
    depth: params.depth ?? 800,
    height: params.height ?? 1800,
    weight: params.weight ?? 200,
    capacity: params.capacity ?? 10,
    capacityUnit: params.capacityUnit ?? 'kW',
    voltage: params.voltage ?? 230,
    phase: params.phase ?? 3,
    position: params.position ?? { x: 0, y: 0, z: 0 },
  };
}

// ─── MEP System ───────────────────────────────────────────────────────────────

export interface MEPSystem {
  id: string;
  name: string;
  type: 'mechanical' | 'electrical' | 'plumbing';
  elements: string[];   // element IDs
  flowRate?: number;    // L/s or m³/s
  pressure?: number;    // Pa
  temperature?: number; // °C
}

export function createMEPSystem(params: {
  name: string;
  type: MEPSystem['type'];
  elements?: string[];
}): MEPSystem {
  return {
    id: crypto.randomUUID(),
    name: params.name,
    type: params.type,
    elements: params.elements ?? [],
  };
}

export function addElementToSystem(system: MEPSystem, elementId: string): MEPSystem {
  return { ...system, elements: [...system.elements, elementId] };
}
