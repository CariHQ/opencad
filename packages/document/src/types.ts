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
  /** Present when this element is a placed parametric family instance. */
  family?: FamilyInstance;
}

export type ElementType =
  // ── Architectural ────────────────────────────────────────────────────────
  | 'wall'
  | 'door'
  | 'window'
  | 'skylight'           // roof-mounted window
  | 'slab'
  | 'roof'
  | 'ceiling'            // slab-like; position=ceiling
  | 'foundation'         // slab-like; position=foundation
  | 'column'
  | 'beam'
  | 'truss'              // composite beam structure
  | 'brace'              // diagonal brace member
  | 'stair'
  | 'ramp'               // sloped slab
  | 'railing'
  | 'mass'               // conceptual volume
  | 'space'              // zone / room
  | 'curtain_wall'
  // ── MEP ──────────────────────────────────────────────────────────────────
  | 'duct'
  | 'pipe'
  | 'cable_tray'
  | 'conduit'
  | 'plumbing_fixture'
  | 'electrical_equipment'
  | 'mechanical_equipment'
  | 'sprinkler'          // fire-suppression head
  | 'lamp'               // light fixture
  | 'air_terminal'       // diffuser / grille
  // ── Site ─────────────────────────────────────────────────────────────────
  | 'topography'         // terrain surface
  | 'property_line'      // site boundary
  // ── Documentation / annotation ──────────────────────────────────────────
  | 'annotation'
  | 'dimension'
  | 'grid'
  | 'label'              // callout with leader
  | 'section_mark'       // view-reference marker
  | 'elevation_mark'
  | 'detail_mark'
  | 'revision_cloud'
  | 'room_separator'     // zero-thickness separator
  | 'model_text'         // 3D text in model space
  // ── 2D drafting primitives ───────────────────────────────────────────────
  | 'line'
  | 'circle'
  | 'arc'
  | 'polyline'
  | 'surface'
  | 'solid'
  | 'point'
  | 'hotspot'            // GDL-style anchor point
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
  type: '3d' | '2d' | 'section' | 'render';
  camera: ViewCamera;
  /**
   * Photoreal render payload (only set when `type === 'render'`).
   * `png` is a data URI so the rendering is self-contained in the doc
   * without requiring external blob storage.
   */
  render?: {
    png: string;
    width: number;
    height: number;
    samples: number;
    envPreset?: string;
    createdAt: number;
  };
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

// ── Parametric Object Language (T-EXT-01) ────────────────────────────────────

/** Supported parameter types for a family parameter. */
export type ParamType = 'number' | 'boolean' | 'enum' | 'string' | 'material-ref' | 'dimension';

/** A scalar value that a parameter can hold. */
export type ParamValue = number | boolean | string;

/** Metadata for one parameter of a family definition. */
export interface ParamSchema {
  /** Unique key within this family's parameter list. */
  id: string;
  /** Human-readable label shown in the properties form. */
  label: string;
  type: ParamType;
  /** Default value — used when placing a new instance. */
  default: ParamValue;
  /** For type='number' or 'dimension' */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** For type='enum' */
  options?: { value: string; label: string }[];
}

/** Simplified mesh output from a family geometry callback. */
export interface FamilyGeometry {
  /** Flat [x,y,z, x,y,z, …] vertex positions. */
  vertices: number[];
  /** Triangle index triples (CCW winding). */
  faces: number[];
  /** Pre-computed bounding box; computed from vertices if omitted. */
  boundingBox?: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
}

/** Per-instance state persisted in `ElementSchema.family`. */
export interface FamilyInstance {
  /** ID of the registered `FamilyDefinition`. */
  familyId: string;
  /** Family version at the time of placement — used for migration prompts. */
  version: string;
  /** Current parameter values for this instance. */
  params: Record<string, ParamValue>;
}

export interface PhaseSchema {
  id: string;
  name: string;
  status: 'existing' | 'new' | 'demolished' | 'incomplete';
}

export interface DocumentContent {
  elements: Record<string, ElementSchema>;
  spaces: Record<string, SpaceSchema>;
}

export interface DocumentOrganization {
  layers: Record<string, LayerSchema>;
  levels: Record<string, LevelSchema>;
  phases?: Record<string, PhaseSchema>;
}

export interface DocumentPresentation {
  views: Record<string, ViewSchema>;
  annotations: Record<string, AnnotationSchema>;
}

/**
 * Composite wall / slab / roof structure (T-MOD-004).
 * An ordered stack of layers drawn from inside to outside.
 */
export interface CompositeLayer {
  /** References a BuildingMaterial / MaterialSchema by id or name. */
  material: string;
  /** Thickness in millimetres. Must be > 0. */
  thickness: number;
  /** At most one layer in a composite may carry core=true — it's the
   *  structural core whose centerline the element's reference line follows. */
  core?: boolean;
  /** Which face this layer renders on (2D fill style hint). */
  finish?: 'exterior' | 'interior' | 'both';
}

export interface Composite {
  id: string;
  name: string;
  /** 'wall' | 'slab' | 'roof' — scope of where this composite may be used. */
  category: 'wall' | 'slab' | 'roof';
  layers: CompositeLayer[];
}

// ── Visual programming graph (T-EXT-02) ─────────────────────────────────────

/** Socket type for typed edge connections. */
export type SocketType = 'number' | 'point' | 'curve' | 'surface' | 'brep' | 'material' | 'element' | 'list' | 'any';

/** A single node in a visual programming graph. */
export interface GraphNodeData {
  id: string;
  type: string;
  label?: string;
  /** User-editable parameter values (sliders, text inputs, etc.). */
  params: Record<string, unknown>;
  /** Screen position for the canvas. */
  position: { x: number; y: number };
}

/** A directed edge connecting an output socket to an input socket. */
export interface GraphEdgeData {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

/** A complete graph persisted in the document library. */
export interface GraphDefinition {
  id: string;
  name: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface DocumentLibrary {
  materials: Record<string, MaterialSchema>;
  families?: Record<string, FamilySchema>;
  blocks?: Record<string, ElementSchema>;
  /** Composite structures referenced by element CompositeId property. */
  composites?: Record<string, Composite>;
  /** Visual programming graphs (T-EXT-02). */
  graphs?: GraphDefinition[];
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
  content: DocumentContent;
  organization: DocumentOrganization;
  timestamp: number;
}
