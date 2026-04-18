/**
 * Minimal DocumentSchema types used by the AI compliance engine.
 * These mirror the shapes defined in @opencad/document without creating a
 * hard package dependency, keeping the AI package self-contained and
 * offline-capable.
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

export interface Transform {
  translation: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
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
  | 'spline'
  | 'component'
  | 'group'
  | 'plumbing_fixture'
  | 'electrical_equipment'
  | 'mechanical_equipment'
  | 'duct'
  | 'pipe'
  | 'cable_tray'
  | 'conduit'
  | 'structural_member';

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

export interface SpaceSchema {
  id: string;
  name: string;
  boundaries: string[];
  area: number;
  volume: number;
  levelId: string;
}

export interface ViewSchema {
  id: string;
  name: string;
  type: '3d' | '2d' | 'section';
}

export interface AnnotationSchema {
  type: string;
  content: string;
  position: Point3D;
}

export interface MaterialSchema {
  id: string;
  name: string;
  category: string;
}

export interface DocumentContent {
  elements: Record<string, ElementSchema>;
  spaces: Record<string, SpaceSchema>;
}

export interface DocumentOrganization {
  layers: Record<string, LayerSchema>;
  levels: Record<string, LevelSchema>;
}

export interface DocumentPresentation {
  views: Record<string, ViewSchema>;
  annotations: Record<string, AnnotationSchema>;
}

export interface DocumentLibrary {
  materials: Record<string, MaterialSchema>;
}

export interface DocumentSchema {
  id: string;
  name: string;
  version: VectorClock;
  metadata: DocumentMetadata;
  content: DocumentContent;
  organization: DocumentOrganization;
  presentation: DocumentPresentation;
  library: DocumentLibrary;
}
