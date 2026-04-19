/**
 * Document Model
 *
 * Core CRDT document model with event handling, versioning, and offline support.
 */

import {
  DocumentSchema,
  LayerSchema,
  LevelSchema,
  ElementSchema,
  ElementType,
  PropertyValue,
  ElementGeometry,
  SyncOperation,
  SyncResult,
  SaveEventData,
  Point3D,
  BoundingBox3D,
} from './types';
import { createDefaultMaterials } from './material';
import { parseIFC, serializeIFC } from './ifc';

export interface CreateProjectOptions {
  name?: string;
  template?: 'blank' | 'residential' | 'commercial' | 'interior';
}

export function createProject(
  projectId: string,
  userId: string,
  options: CreateProjectOptions = {}
): DocumentSchema {
  const now = Date.now();
  const defaultLayerId = crypto.randomUUID();
  const defaultLevelId = crypto.randomUUID();

  const defaultLayer: LayerSchema = {
    id: defaultLayerId,
    name: 'Layer 1',
    color: '#808080',
    visible: true,
    locked: false,
    order: 0,
  };

  const defaultLevel: LevelSchema = {
    id: defaultLevelId,
    name: 'Level 1',
    elevation: 0,
    height: 3000,
    order: 0,
  };

  return {
    id: projectId,
    name: options.name || 'Untitled Project',
    version: { clock: {} },
    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      schemaVersion: '1.0.0',
    },
    content: {
      elements: {},
      spaces: {},
    },
    organization: {
      layers: { [defaultLayerId]: defaultLayer },
      levels: { [defaultLevelId]: defaultLevel },
    },
    presentation: {
      views: {},
      annotations: {},
    },
    library: {
      materials: createDefaultMaterials(),
    },
  };
}

export interface AddElementParams {
  type: ElementType;
  layerId: string;
  levelId: string;
  properties?: Record<string, PropertyValue>;
  geometry?: ElementGeometry;
  points?: Point3D[];
  transform?: {
    translation: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
}

export function addElement(document: DocumentSchema, params: AddElementParams): string {
  const elementId = crypto.randomUUID();
  const now = Date.now();
  const props = params.properties || {};

  const element: ElementSchema = {
    id: elementId,
    type: params.type,
    properties: props,
    propertySets: [],
    geometry: params.geometry || { type: 'brep', data: null },
    layerId: params.layerId,
    levelId: params.levelId || null,
    transform: params.transform || {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: computeBoundingBox(params.type, props),
    metadata: {
      id: elementId,
      createdBy: 'import',
      createdAt: now,
      updatedAt: now,
      version: { clock: {} },
    },
    visible: true,
    locked: false,
  };

  if (params.points) {
    (element as { points?: Point3D[] }).points = params.points;
  }

  document.content.elements[elementId] = element;
  document.metadata.updatedAt = now;

  return elementId;
}

/**
 * Computes a bounding box for an element based on its type and properties.
 * Returns a BoundingBox3D with at least 1-unit size in each axis.
 */
export function computeBoundingBox(
  elementType: string,
  properties: Record<string, PropertyValue>,
): BoundingBox3D {
  const num = (key: string, fallback = 0): number => {
    const v = properties[key]?.value;
    return typeof v === 'number' ? v : fallback;
  };

  let minX = 0, minY = 0, minZ = 0;
  let maxX = 0, maxY = 0, maxZ = 0;

  switch (elementType) {
    case 'wall': {
      const sx = num('StartX'), sy = num('StartY');
      const ex = num('EndX'), ey = num('EndY');
      minX = Math.min(sx, ex); maxX = Math.max(sx, ex);
      minY = Math.min(sy, ey); maxY = Math.max(sy, ey);
      minZ = 0; maxZ = num('Height', 3000);
      break;
    }
    case 'curtain_wall': {
      const sx = num('StartX'), sy = num('StartY');
      const ex = num('EndX'), ey = num('EndY');
      minX = Math.min(sx, ex); maxX = Math.max(sx, ex);
      minY = Math.min(sy, ey); maxY = Math.max(sy, ey);
      minZ = 0; maxZ = num('Height', 3000);
      break;
    }
    case 'beam': {
      const sx = num('StartX'), sy = num('StartY');
      const ex = num('EndX'), ey = num('EndY');
      minX = Math.min(sx, ex); maxX = Math.max(sx, ex);
      minY = Math.min(sy, ey); maxY = Math.max(sy, ey);
      minZ = 0; maxZ = 300; // beam depth ~ 300mm
      break;
    }
    case 'line':
    case 'dimension': {
      const sx = num('StartX'), sy = num('StartY');
      const ex = num('EndX'), ey = num('EndY');
      minX = Math.min(sx, ex); maxX = Math.max(sx, ex);
      minY = Math.min(sy, ey); maxY = Math.max(sy, ey);
      break;
    }
    case 'rectangle':
    case 'slab': {
      const x = num('X'), y = num('Y');
      const w = num('Width'), h = num('Height');
      const depth = num('Depth', num('Thickness', 200));
      minX = x; maxX = x + w;
      minY = y; maxY = y + h;
      minZ = 0; maxZ = depth;
      break;
    }
    case 'space': {
      if ('StartX' in properties) {
        const sx = num('StartX'), sy = num('StartY');
        const ex = num('EndX'), ey = num('EndY');
        minX = sx; maxX = ex;
        minY = sy; maxY = ey;
      } else if ('MinX' in properties) {
        minX = num('MinX'); maxX = num('MaxX');
        minY = num('MinY'); maxY = num('MaxY');
      } else {
        const x = num('X'), y = num('Y');
        const w = num('Width'), h = num('Height');
        minX = x; maxX = x + w;
        minY = y; maxY = y + h;
      }
      break;
    }
    case 'polyline':
    case 'polygon': {
      const ptsVal = properties['Points']?.value;
      if (typeof ptsVal === 'string' && ptsVal.length > 0) {
        try {
          const pts = JSON.parse(ptsVal) as Array<{ x: number; y: number }>;
          if (pts.length > 0) {
            minX = Math.min(...pts.map((p) => p.x));
            maxX = Math.max(...pts.map((p) => p.x));
            minY = Math.min(...pts.map((p) => p.y));
            maxY = Math.max(...pts.map((p) => p.y));
            break;
          }
        } catch { /* fall through to ensureMin */ }
      }
      minX = num('X'); minY = num('Y');
      maxX = minX; maxY = minY;
      break;
    }
    case 'circle':
    case 'arc': {
      const cx = num('CenterX'), cy = num('CenterY');
      const r = num('Radius', 25);
      minX = cx - r; maxX = cx + r;
      minY = cy - r; maxY = cy + r;
      break;
    }
    case 'column': {
      const x = num('X'), y = num('Y');
      const d = num('Diameter', 400);
      minX = x - d / 2; maxX = x + d / 2;
      minY = y - d / 2; maxY = y + d / 2;
      minZ = 0; maxZ = num('Height', 3000);
      break;
    }
    case 'door': {
      const x = num('X'), y = num('Y');
      const w = num('Width', 900), h = num('Height', 2100);
      minX = x; maxX = x + w;
      minY = y - 50; maxY = y + 200; // thin in plan
      minZ = 0; maxZ = h;
      break;
    }
    case 'window': {
      const x = num('X'), y = num('Y');
      const w = num('Width', 1200), h = num('Height', 1200);
      const sill = num('SillHeight', 900);
      minX = x; maxX = x + w;
      minY = y - 50; maxY = y + 200;
      minZ = sill; maxZ = sill + h;
      break;
    }
    case 'stair': {
      const x = num('X'), y = num('Y');
      const w = num('Width2D', num('Width', 1200));
      const l = num('Length', 3000);
      minX = x; maxX = x + w;
      minY = y; maxY = y + l;
      minZ = 0; maxZ = num('TotalRise', 3000);
      break;
    }
    case 'railing': {
      const ptsVal = properties['Points']?.value;
      if (typeof ptsVal === 'string' && ptsVal.length > 0) {
        try {
          const pts = JSON.parse(ptsVal) as Array<{ x: number; y: number }>;
          if (pts.length > 0) {
            minX = Math.min(...pts.map((p) => p.x));
            maxX = Math.max(...pts.map((p) => p.x));
            minY = Math.min(...pts.map((p) => p.y));
            maxY = Math.max(...pts.map((p) => p.y));
          }
        } catch { /* fall through */ }
      }
      minZ = 0; maxZ = num('Height', 1000);
      break;
    }
    case 'roof': {
      const ptsVal = properties['Points']?.value;
      if (typeof ptsVal === 'string' && ptsVal.length > 0) {
        try {
          const pts = JSON.parse(ptsVal) as Array<{ x: number; y: number }>;
          if (pts.length > 0) {
            minX = Math.min(...pts.map((p) => p.x));
            maxX = Math.max(...pts.map((p) => p.x));
            minY = Math.min(...pts.map((p) => p.y));
            maxY = Math.max(...pts.map((p) => p.y));
          }
        } catch { /* fall through */ }
      }
      minZ = 0; maxZ = num('Thickness', 300);
      break;
    }
    case 'text': {
      const x = num('X'), y = num('Y');
      minX = x; maxX = x + 100;
      minY = y; maxY = y + 20;
      break;
    }
    default: {
      minX = num('X'); minY = num('Y');
      maxX = minX; maxY = minY;
    }
  }

  // Ensure minimum bounding box size of 1 unit in each planar axis
  if (maxX - minX < 1) { const cx = (minX + maxX) / 2; minX = cx - 0.5; maxX = cx + 0.5; }
  if (maxY - minY < 1) { const cy = (minY + maxY) / 2; minY = cy - 0.5; maxY = cy + 0.5; }
  if (maxZ - minZ < 1) maxZ = minZ + 1;

  return {
    min: { x: minX, y: minY, z: minZ, _type: 'Point3D' },
    max: { x: maxX, y: maxY, z: maxZ, _type: 'Point3D' },
  };
}

type SaveHandler = (data: SaveEventData) => void;
type SyncCompleteHandler = (result: SyncResult) => void;
type VersionHandler = (version: VersionSnapshot) => void;

interface VersionSnapshot {
  version: number;
  timestamp: number;
  message?: string;
  state: DocumentSchema;
}

export class DocumentModel {
  private document: DocumentSchema;
  private clientId: string;
  private pendingOperations: SyncOperation[] = [];
  private isOnline: boolean = true;
  private saveHandlers: SaveHandler[] = [];
  private syncHandlers: SyncCompleteHandler[] = [];
  private versionHandlers: VersionHandler[] = [];
  private versions: VersionSnapshot[] = [];
  private currentVersionNumber: number = 0;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 2000;

  constructor(projectId: string, userId: string) {
    this.clientId = userId;
    this.document = createProject(projectId, userId);
  }

  get id(): string {
    return this.document.id;
  }

  get client(): string {
    return this.clientId;
  }

  get documentData(): DocumentSchema {
    return this.document;
  }

  loadDocument(saved: DocumentSchema): void {
    this.document = saved;
    // Migrate elements with degenerate (zero) bounding boxes
    for (const element of Object.values(this.document.content.elements)) {
      const bb = element.boundingBox;
      const isDegenerate =
        bb.min.x === 0 && bb.min.y === 0 && bb.min.z === 0 &&
        bb.max.x === 0 && bb.max.y === 0 && bb.max.z === 0;
      if (isDegenerate) {
        element.boundingBox = computeBoundingBox(element.type, element.properties);
      }
    }
  }

  get elements(): Record<string, ElementSchema> {
    return this.document.content.elements;
  }

  get layers(): Record<string, LayerSchema> {
    return this.document.organization.layers;
  }

  get levels(): Record<string, LevelSchema> {
    return this.document.organization.levels;
  }

  onSave(handler: SaveHandler): () => void {
    this.saveHandlers.push(handler);
    return () => {
      this.saveHandlers = this.saveHandlers.filter((h) => h !== handler);
    };
  }

  onSyncComplete(handler: SyncCompleteHandler): () => void {
    this.syncHandlers.push(handler);
    return () => {
      this.syncHandlers = this.syncHandlers.filter((h) => h !== handler);
    };
  }

  onVersion(handler: VersionHandler): () => void {
    this.versionHandlers.push(handler);
    return () => {
      this.versionHandlers = this.versionHandlers.filter((h) => h !== handler);
    };
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    if (online && this.pendingOperations.length > 0) {
      this.processPendingOperations();
    }
  }

  getPendingOperations(): SyncOperation[] {
    return [...this.pendingOperations];
  }

  addLayer(params: { name: string; color: string; visible?: boolean; locked?: boolean }): string {
    const layerId = crypto.randomUUID();
    const order = Object.keys(this.document.organization.layers).length;

    const layer: LayerSchema = {
      id: layerId,
      name: params.name,
      color: params.color,
      visible: params.visible ?? true,
      locked: params.locked ?? false,
      order,
    };

    this.document.organization.layers[layerId] = layer;
    this.queueOperation('create', 'layer', layerId, layer);
    this.scheduleSave();
    this.document.metadata.updatedAt = Date.now();

    return layerId;
  }

  updateLayer(layerId: string, updates: Partial<Omit<LayerSchema, 'id'>>): void {
    const layer = this.document.organization.layers[layerId];
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`);
    }

    Object.assign(layer, updates);
    this.queueOperation('update', 'layer', layerId, layer);
    this.scheduleSave();
    this.document.metadata.updatedAt = Date.now();
  }

  deleteLayer(layerId: string): void {
    const layer = this.document.organization.layers[layerId];
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`);
    }

    delete this.document.organization.layers[layerId];
    this.queueOperation('delete', 'layer', layerId, null);
    this.scheduleSave();
    this.document.metadata.updatedAt = Date.now();
  }

  addLevel(params: { name: string; elevation: number; height?: number }): string {
    const levelId = crypto.randomUUID();
    const order = Object.keys(this.document.organization.levels).length;

    const level: LevelSchema = {
      id: levelId,
      name: params.name,
      elevation: params.elevation,
      height: params.height ?? 3000,
      order,
    };

    this.document.organization.levels[levelId] = level;
    this.queueOperation('create', 'level', levelId, level);
    this.scheduleSave();
    this.document.metadata.updatedAt = Date.now();

    return levelId;
  }

  addElement(params: {
    type: ElementType;
    layerId: string;
    levelId?: string;
    properties?: Record<string, PropertyValue>;
    geometry?: ElementGeometry;
  }): string {
    const elementId = crypto.randomUUID();
    const now = Date.now();

    const props = params.properties || {};
    const element: ElementSchema = {
      id: elementId,
      type: params.type,
      properties: props,
      propertySets: [],
      geometry: params.geometry || { type: 'brep', data: null },
      layerId: params.layerId,
      levelId: params.levelId || null,
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: computeBoundingBox(params.type, props),
      metadata: {
        id: elementId,
        createdBy: this.clientId,
        createdAt: now,
        updatedAt: now,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };

    this.document.content.elements[elementId] = element;
    this.queueOperation('create', 'element', elementId, element);
    this.scheduleSave();
    this.document.metadata.updatedAt = Date.now();

    return elementId;
  }

  getElementByName(name: string): ElementSchema | undefined {
    return Object.values(this.document.content.elements).find(
      (e) => e.properties.Name?.value === name
    );
  }

  getElementById(id: string): ElementSchema | undefined {
    return this.document.content.elements[id];
  }

  createVersion(message?: string): VersionSnapshot {
    this.currentVersionNumber++;
    const snapshot: VersionSnapshot = {
      version: this.currentVersionNumber,
      timestamp: Date.now(),
      message,
      state: JSON.parse(JSON.stringify(this.document)),
    };

    this.versions.push(snapshot);

    this.versionHandlers.forEach((handler) => handler(snapshot));

    return snapshot;
  }

  getVersionList(): Array<{ version: number; timestamp: number; message?: string }> {
    return this.versions.map(({ version, timestamp, message }) => ({ version, timestamp, message }));
  }

  getVersion(versionNumber: number): DocumentSchema {
    const version = this.versions.find((v) => v.version === versionNumber);
    if (!version) {
      throw new Error(`Version ${versionNumber} does not exist`);
    }
    return version.state;
  }

  restoreVersion(versionNumber: number): void {
    const version = this.versions.find((v) => v.version === versionNumber);
    if (!version) {
      throw new Error(`Version ${versionNumber} does not exist`);
    }

    this.document = JSON.parse(JSON.stringify(version.state));
    this.document.metadata.updatedAt = Date.now();
    this.scheduleSave();
  }

  private queueOperation(
    operation: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    data: unknown
  ): void {
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      projectId: this.document.id,
      operation,
      entityType,
      entityId,
      data,
      timestamp: Date.now(),
      clientId: this.clientId,
      synced: false,
    };

    if (this.isOnline) {
      syncOp.synced = true;
    } else {
      this.pendingOperations.push(syncOp);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.emitSave();
      this.saveTimeout = null;
    }, this.SAVE_DEBOUNCE_MS);
  }

  private emitSave(): void {
    const saveData: SaveEventData = {
      content: { ...this.document.content },
      organization: { ...this.document.organization },
      timestamp: Date.now(),
    };

    this.saveHandlers.forEach((handler) => handler(saveData));
  }

  private processPendingOperations(): void {
    const processed = this.pendingOperations.length;
    this.pendingOperations = [];
    this.isOnline = true;

    const result: SyncResult = {
      operationsProcessed: processed,
      success: true,
    };

    this.syncHandlers.forEach((handler) => handler(result));
  }

  static fromIFC(content: string): DocumentModel {
    const parsed = parseIFC(content);
    const model = new DocumentModel(parsed.id, parsed.metadata.createdBy);
    model.document = parsed;
    return model;
  }

  static toIFC(document: DocumentSchema): string {
    return serializeIFC(document);
  }
}
