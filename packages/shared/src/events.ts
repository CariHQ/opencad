/**
 * Event Types
 * Application event definitions
 */

export type EventType =
  | 'element:created'
  | 'element:updated'
  | 'element:deleted'
  | 'layer:created'
  | 'layer:updated'
  | 'layer:deleted'
  | 'level:created'
  | 'level:updated'
  | 'level:deleted'
  | 'view:created'
  | 'view:updated'
  | 'view:deleted'
  | 'selection:changed'
  | 'tool:changed'
  | 'document:saved'
  | 'document:loaded'
  | 'document:sync-started'
  | 'document:sync-completed'
  | 'document:sync-error'
  | 'undo:performed'
  | 'redo:performed'
  | 'camera:changed'
  | 'viewport:resized';

export interface AppEvent<T = unknown> {
  type: EventType;
  payload: T;
  timestamp: number;
  clientId: string;
}

export interface ElementEvent {
  elementId: string;
  elementType: string;
}

export interface SelectionEvent {
  selectedIds: string[];
  previousIds: string[];
}

export interface SyncEvent {
  projectId: string;
  status: 'started' | 'completed' | 'error';
  error?: string;
  pendingOperations: number;
}

export interface CameraEvent {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
}

export type EventHandler<T = unknown> = (event: AppEvent<T>) => void;

export interface EventBus {
  subscribe<T>(type: EventType, handler: EventHandler<T>): () => void;
  unsubscribe<T>(type: EventType, handler: EventHandler<T>): void;
  emit<T>(event: AppEvent<T>): void;
}

export function createEvent<T>(type: EventType, payload: T, clientId: string): AppEvent<T> {
  return {
    type,
    payload,
    timestamp: Date.now(),
    clientId,
  };
}
