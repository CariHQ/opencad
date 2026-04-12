/**
 * Document Types
 * CRDT document model types
 */

import type { Point3D, Vector3D, Transform, BoundingBox3D } from './geometry';

export interface UUID {
  readonly value: string;
}

export interface VectorClock {
  readonly clock: Record<string, number>;
}

export type ElementType =
  | 'wall'
  | 'door'
  | 'window'
  | 'slab'
  | 'roof'
  | 'column'
  | 'beam'
  | 'stair'
  | 'railing'
  | 'space'
  | 'annotation'
  | 'dimension'
  | 'grid';

export interface PropertyValue {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'reference';
  value: string | number | boolean | string[];
  unit?: string;
}

export interface PropertyDefinition {
  name: string;
  type: PropertyValue['type'];
  defaultValue?: PropertyValue['value'];
  allowedValues?: PropertyValue['value'][];
  unit?: string;
  category: string;
  description?: string;
  isReadOnly?: boolean;
  isVisible?: boolean;
}

export interface PropertySet {
  id: string;
  name: string;
  properties: Record<string, PropertyValue>;
}

export interface ElementGeometry {
  type: 'brep' | 'mesh' | 'curve' | 'point';
  data: unknown;
}

export interface CRDTMetadata {
  id: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  version: VectorClock;
}

export interface CRDTElement {
  id: string;
  type: ElementType;
  properties: Record<string, PropertyValue>;
  propertySets: PropertySet[];
  geometry: ElementGeometry;
  layerId: string;
  levelId: string | null;
  transform: Transform;
  boundingBox: BoundingBox3D;
  metadata: CRDTMetadata;
  visible: boolean;
  locked: boolean;
}

export interface CRDTLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export interface CRDTLevel {
  id: string;
  name: string;
  elevation: number;
  height: number;
  order: number;
}

export interface CRDTView {
  id: string;
  name: string;
  type: '3d' | '2d' | 'section';
  camera: {
    position: Vector3D;
    target: Vector3D;
    up: Vector3D;
    fov: number;
    near: number;
    far: number;
  };
  clippingPlanes?: {
    normal: Vector3D;
    constant: number;
  }[];
}

export interface CRDTMaterial {
  id: string;
  name: string;
  category: string;
  properties: {
    color?: { r: number; g: number; b: number; a: number };
    roughness?: number;
    metalness?: number;
    transparency?: number;
    emissive?: { r: number; g: number; b: number };
  };
}

export interface CRDTSpace {
  id: string;
  name: string;
  boundaries: string[];
  area: number;
  volume: number;
  levelId: string;
}

export interface CRDTAnnotation {
  id: string;
  type: 'text' | 'leader' | 'callout' | 'cloud';
  content: string;
  position: Point3D;
  anchorElementId?: string;
}

export interface CRDTDocument {
  id: string;
  name: string;
  version: VectorClock;
  elements: Record<string, CRDTElement>;
  layers: Record<string, CRDTLayer>;
  levels: Record<string, CRDTLevel>;
  views: Record<string, CRDTView>;
  materials: Record<string, CRDTMaterial>;
  spaces: Record<string, CRDTSpace>;
  annotations: Record<string, CRDTAnnotation>;
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    schemaVersion: string;
  };
}

export function createUUID(): UUID {
  return {
    value: crypto.randomUUID(),
  };
}

export function createVectorClock(): VectorClock {
  return { clock: {} };
}

export function incrementVectorClock(clock: VectorClock, clientId: string): VectorClock {
  const newClock = { ...clock.clock };
  newClock[clientId] = (newClock[clientId] || 0) + 1;
  return { clock: newClock };
}

export function mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(a.clock), ...Object.keys(b.clock)]);
  for (const key of allKeys) {
    merged[key] = Math.max(a.clock[key] || 0, b.clock[key] || 0);
  }
  return { clock: merged };
}
