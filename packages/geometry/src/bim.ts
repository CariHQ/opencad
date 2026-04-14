/**
 * BIM Element Geometry Module
 * Wall, Door, Window, Slab, Roof creation and hosted element management
 * T-3D-004
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HostedElementRef {
  elementId: string;
  offset: number;
}

export interface BIMWall {
  id: string;
  type: 'wall';
  start: Point3D;
  end: Point3D;
  height: number;
  thickness: number;
  length: number;
  volume: number;
  hostedElements: HostedElementRef[];
}

export interface BIMDoor {
  id: string;
  type: 'door';
  width: number;
  height: number;
  thickness: number;
  swing: 'left' | 'right';
}

export interface BIMWindow {
  id: string;
  type: 'window';
  width: number;
  height: number;
  sillHeight: number;
  topHeight: number;
}

export interface BIMSlab {
  id: string;
  type: 'slab';
  width: number;
  depth: number;
  thickness: number;
  elevation: number;
  volume: number;
}

export interface BIMRoof {
  id: string;
  type: 'roof';
  width: number;
  depth: number;
  pitch: number;
  style: 'gabled' | 'hipped' | 'flat' | 'shed';
  ridgeHeight: number;
}

type HostableElement = BIMDoor | BIMWindow;

// ─── ID generation ────────────────────────────────────────────────────────────

let _idCounter = 0;
function _nextId(prefix: string): string {
  return `${prefix}-${++_idCounter}`;
}

// ─── Wall ────────────────────────────────────────────────────────────────────

export interface WallOptions {
  height: number;
  thickness?: number;
}

export function createWall(start: Point3D, end: Point3D, options: WallOptions): BIMWall {
  const { height, thickness = 0.2 } = options;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return {
    id: _nextId('wall'),
    type: 'wall',
    start,
    end,
    height,
    thickness,
    length,
    volume: length * height * thickness,
    hostedElements: [],
  };
}

// ─── Door ─────────────────────────────────────────────────────────────────────

export interface DoorOptions {
  width: number;
  height: number;
  thickness?: number;
  swing?: 'left' | 'right';
}

export function createDoor(options: DoorOptions): BIMDoor {
  return {
    id: _nextId('door'),
    type: 'door',
    width: options.width,
    height: options.height,
    thickness: options.thickness ?? 0.05,
    swing: options.swing ?? 'left',
  };
}

// ─── Window ───────────────────────────────────────────────────────────────────

export interface WindowOptions {
  width: number;
  height: number;
  sillHeight: number;
}

export function createWindow(options: WindowOptions): BIMWindow {
  return {
    id: _nextId('window'),
    type: 'window',
    width: options.width,
    height: options.height,
    sillHeight: options.sillHeight,
    topHeight: options.sillHeight + options.height,
  };
}

// ─── Slab ─────────────────────────────────────────────────────────────────────

export interface SlabOptions {
  width: number;
  depth: number;
  thickness: number;
  elevation: number;
}

export function createSlab(options: SlabOptions): BIMSlab {
  return {
    id: _nextId('slab'),
    type: 'slab',
    ...options,
    volume: options.width * options.depth * options.thickness,
  };
}

// ─── Roof ─────────────────────────────────────────────────────────────────────

export interface RoofOptions {
  width: number;
  depth: number;
  pitch: number; // degrees
  style: BIMRoof['style'];
}

export function createRoof(options: RoofOptions): BIMRoof {
  const ridgeHeight =
    options.pitch === 0
      ? 0
      : (options.width / 2) * Math.tan((options.pitch * Math.PI) / 180);

  return {
    id: _nextId('roof'),
    type: 'roof',
    width: options.width,
    depth: options.depth,
    pitch: options.pitch,
    style: options.style,
    ridgeHeight,
  };
}

// ─── Hosted Elements ──────────────────────────────────────────────────────────

export interface InsertOptions {
  offset: number; // distance along wall from start
}

export function insertHostedElement(
  wall: BIMWall,
  element: HostableElement,
  options: InsertOptions
): BIMWall {
  return {
    ...wall,
    hostedElements: [
      ...wall.hostedElements,
      { elementId: element.id, offset: options.offset },
    ],
  };
}

export function getHostedElements(wall: BIMWall): HostedElementRef[] {
  return wall.hostedElements;
}
