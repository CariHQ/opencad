/**
 * Document Types
 */

export interface VectorClock {
  clock: Record<string, number>;
}

export interface DocumentMetadata {
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  schemaVersion: string;
}

export interface Transform {
  translation: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Point3D extends Vector3D {
  _type: 'Point3D';
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
}

export interface PropertyValue {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'reference';
  value: string | number | boolean | string[];
  unit?: string;
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

export interface ElementMetadata {
  id: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  version: VectorClock;
}

export interface ElementSchema {
  id: string;
  type: ElementType;
  properties: Record<string, PropertyValue>;
  propertySets: PropertySet[];
  geometry: ElementGeometry;
  layerId: string;
  levelId: string | null;
  transform: Transform;
  boundingBox: BoundingBox3D;
  metadata: ElementMetadata;
  visible: boolean;
  locked: boolean;
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
  | 'grid'
  | 'line'
  | 'circle'
  | 'arc'
  | 'polyline'
  | 'surface'
  | 'solid'
  | 'point'
  | 'text'
  | 'block_ref'
  | 'ellipse'
  | 'rectangle'
  | 'polygon'
  | 'component'
  | 'group';

export interface LayerSchema {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export interface LevelSchema {
  id: string;
  name: string;
  elevation: number;
  height: number;
  order: number;
}

export interface ViewCamera {
  position: Vector3D;
  target: Vector3D;
  up: Vector3D;
  fov: number;
  near: number;
  far: number;
}

export interface ViewSchema {
  id: string;
  name: string;
  type: '3d' | '2d' | 'section';
  camera: ViewCamera;
}

export interface MaterialProperties {
  color?: { r: number; g: number; b: number; a: number };
  roughness?: number;
  metalness?: number;
  transparency?: number;
  emissive?: { r: number; g: number; b: number };
}

export interface MaterialSchema {
  id: string;
  name: string;
  category: string;
  properties: MaterialProperties;
}

export interface SpaceSchema {
  id: string;
  name: string;
  boundaries: string[];
  area: number;
  volume: number;
  levelId: string;
}

export interface AnnotationSchema {
  type: 'text' | 'leader' | 'callout' | 'cloud' | 'link' | 'highlight' | 'underline';
  content: string;
  position: Point3D;
  anchorElementId?: string;
}

export interface FamilySchema {
  id: string;
  name: string;
  category: string;
  properties: Record<string, PropertyValue>;
}

export interface PhaseSchema {
  id: string;
  name: string;
  status: 'existing' | 'new' | 'demolished' | 'incomplete';
}

export interface DocumentSchema {
  id: string;
  name: string;
  version: VectorClock;
  elements: Record<string, ElementSchema>;
  layers: Record<string, LayerSchema>;
  levels: Record<string, LevelSchema>;
  views: Record<string, ViewSchema>;
  materials: Record<string, MaterialSchema>;
  spaces: Record<string, SpaceSchema>;
  annotations: Record<string, AnnotationSchema>;
  metadata: DocumentMetadata;
  blocks?: Record<string, ElementSchema>;
  families?: Record<string, FamilySchema>;
  phases?: Record<string, PhaseSchema>;
}

export interface SyncOperation {
  id: string;
  projectId: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: unknown;
  timestamp: number;
  clientId: string;
  synced: boolean;
}

export interface SyncResult {
  operationsProcessed: number;
  success: boolean;
  errors?: string[];
}

export interface SaveEventData {
  layers: Record<string, LayerSchema>;
  elements: Record<string, ElementSchema>;
  levels: Record<string, LevelSchema>;
  timestamp: number;
}
