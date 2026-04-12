/**
 * Project Types
 * Project and file management types
 */

import type { CRDTDocument } from './document';

export type ProjectStatus = 'active' | 'archived' | 'shared';
export type ProjectTemplate = 'blank' | 'residential' | 'commercial' | 'interior';

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  template?: ProjectTemplate;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastModifiedBy: string;
  tags: string[];
  thumbnail?: string;
}

export interface Project extends ProjectMetadata {
  document: CRDTDocument;
  localVersion: number;
  remoteVersion: number;
  syncStatus: SyncStatus;
  lastSyncedAt?: number;
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'offline' | 'error';

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

export interface ConflictResolution {
  operationId: string;
  resolution: 'local' | 'remote' | 'merge';
  mergedData?: unknown;
  timestamp: number;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  documentSnapshot: CRDTDocument;
  createdAt: number;
  createdBy: string;
  message?: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  status: ProjectStatus;
  thumbnail?: string;
  updatedAt: number;
  lastModifiedBy: string;
}

export interface ImportResult {
  success: boolean;
  format: string;
  entitiesImported: number;
  entitiesSkipped: number;
  warnings: string[];
  errors: string[];
  document?: CRDTDocument;
}

export interface ExportResult {
  success: boolean;
  format: string;
  filePath?: string;
  warnings: string[];
  errors: string[];
}

export type FileFormat = 'opencad' | 'ifc' | 'dwg' | 'dxf' | 'skp' | 'pdf' | 'png' | 'svg';

export interface ExportOptions {
  format: FileFormat;
  includeLayers?: string[];
  includeViews?: string[];
  scale?: number;
  quality?: 'low' | 'medium' | 'high';
}
