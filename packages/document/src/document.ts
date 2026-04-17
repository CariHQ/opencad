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
} from './types';
import { createDefaultMaterials } from './material';
import { parseIFC, serializeIFC } from './ifc';

type BoundingBox = ElementSchema['boundingBox'];

export function computeBoundingBox(
  type: ElementType | string,
  props: Record<string, PropertyValue> = {}
): BoundingBox {
  const num = (key: string): number => {
    const v = props[key];
    return v && v.type === 'number' ? (v.value as number) : 0;
  };
  const str = (key: string): string => {
    const v = props[key];
    return v && v.type === 'string' ? (v.value as string) : '';
  };

  const bb = (minX: number, minY: number, maxX: number, maxY: number, minZ = 0, maxZ = 0): BoundingBox => ({
    min: { x: minX, y: minY, z: minZ, _type: 'Point3D' },
    max: { x: maxX, y: maxY, z: maxZ, _type: 'Point3D' },
  });

  // Ensure minimum 1-unit size in each dimension
  const ensureMin = (minX: number, minY: number, maxX: number, maxY: number): BoundingBox => {
    const padX = maxX - minX < 1 ? (1 - (maxX - minX)) / 2 : 0;
    const padY = maxY - minY < 1 ? (1 - (maxY - minY)) / 2 : 0;
    return bb(minX - padX, minY - padY, maxX + padX, maxY + padY);
  };

  switch (type) {
    case 'wall': {
      const sx = num('StartX'), sy = num('StartY'), ex = num('EndX'), ey = num('EndY');
      return ensureMin(Math.min(sx, ex), Math.min(sy, ey), Math.max(sx, ex), Math.max(sy, ey));
    }
    case 'door':
    case 'window': {
      const x = num('X'), y = num('Y');
      const w = num('Width') || 900, h = num('Height') || 2100;
      return bb(x, y, x + w, y + h);
    }
    case 'column': {
      const x = num('X'), y = num('Y'), r = num('Diameter') / 2;
      return bb(x - r, y - r, x + r, y + r, 0, num('Height'));
    }
    case 'slab': {
      const x = num('X'), y = num('Y'), w = num('Width'), h = num('Height');
      return bb(x, y, x + w, y + h, 0, num('Depth') || 200);
    }
    case 'space': {
      // StartX/StartY/EndX/EndY pattern (T-BIM-008)
      const sx = num('StartX'), sy = num('StartY'), ex = num('EndX'), ey = num('EndY');
      if (ex > 0 || ey > 0) return bb(Math.min(sx, ex), Math.min(sy, ey), Math.max(sx, ex), Math.max(sy, ey));
      // Width/Height pattern
      const x = num('X'), y = num('Y'), w = num('Width'), h = num('Height');
      if (w > 0 || h > 0) return bb(x, y, x + w, y + h);
      // Explicit min/max pattern
      const minX = num('MinX'), minY = num('MinY'), maxX = num('MaxX'), maxY = num('MaxY');
      if (maxX > 0 || maxY > 0) return bb(minX, minY, maxX, maxY);
      return ensureMin(0, 0, 0, 0);
    }
    case 'dimension':
    case 'line':
    case 'annotation': {
      const sx = num('StartX'), sy = num('StartY'), ex = num('EndX'), ey = num('EndY');
      return bb(Math.min(sx, ex), Math.min(sy, ey), Math.max(sx, ex), Math.max(sy, ey));
    }
    case 'circle':
    case 'arc': {
      const cx = num('CenterX'), cy = num('CenterY'), r = num('Radius');
      return bb(cx - r, cy - r, cx + r, cy + r);
    }
    case 'rectangle': {
      const x = num('X'), y = num('Y'), w = num('Width'), h = num('Height');
      return bb(x, y, x + w, y + h);
    }
    case 'polygon':
    case 'polyline': {
      const pointsStr = str('Points');
      try {
        const pts = JSON.parse(pointsStr) as Array<{ x: number; y: number }>;
        if (pts.length === 0) return ensureMin(0, 0, 0, 0);
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        return bb(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      } catch {
        return ensureMin(0, 0, 0, 0);
      }
    }
    case 'text': {
      const x = num('X'), y = num('Y');
      return bb(x, y, x + 100, y + 20);
    }
    default:
      return ensureMin(0, 0, 0, 0);
  }
}

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

  const element: ElementSchema = {
    id: elementId,
    type: params.type,
    properties: params.properties || {},
    propertySets: [],
    geometry: params.geometry || { type: 'brep', data: null },
    layerId: params.layerId,
    levelId: params.levelId || null,
    transform: params.transform || {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      max: { x: 0, y: 0, z: 0, _type: 'Point3D' },
    },
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
    // Migrate degenerate bounding boxes from documents saved before bb computation existed
    for (const el of Object.values(this.document.content.elements)) {
      const bbox = el.boundingBox;
      if (bbox.max.x === 0 && bbox.max.y === 0 && bbox.max.z === 0) {
        el.boundingBox = computeBoundingBox(el.type, el.properties);
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
    const boundingBox = computeBoundingBox(params.type, props);

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
      boundingBox,
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
