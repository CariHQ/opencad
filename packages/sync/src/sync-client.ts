/**
 * Sync Client
 * WebSocket-based synchronization client
 */

import {
  CRDTDocument,
  CRDTOperation,
  VectorClock,
  createVectorClock,
  mergeClocks,
  applyOperation,
  createOperation,
} from './crdt';

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

export interface SyncConfig {
  serverUrl: string;
  projectId: string;
  clientId: string;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

export interface SyncEvent {
  type: 'connected' | 'disconnected' | 'operation' | 'sync' | 'error';
  payload?: unknown;
}

export type SyncEventHandler = (event: SyncEvent) => void;

export class SyncClient {
  private config: SyncConfig;
  private document: CRDTDocument;
  private ws: WebSocket | null = null;
  private status: SyncStatus = 'disconnected';
  private handlers: SyncEventHandler[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingOps: CRDTOperation[] = [];

  constructor(config: SyncConfig, initialData: unknown) {
    this.config = {
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      ...config,
    };

    this.document = {
      id: config.projectId,
      data: initialData,
      vectorClock: createVectorClock(),
      pendingOps: [],
      serverVectorClock: createVectorClock(),
    };
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getDocument(): CRDTDocument {
    return this.document;
  }

  getData(): unknown {
    return this.document.data;
  }

  connect(): void {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      const url = `${this.config.serverUrl}?project=${this.config.projectId}&client=${this.config.clientId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.emit({ type: 'connected' });
        this.flushPendingOperations();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.emit({ type: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.setStatus('error');
        this.emit({ type: 'error', payload: error });
      };
    } catch (error) {
      this.setStatus('error');
      this.emit({ type: 'error', payload: error });
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  onEvent(handler: SyncEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  applyLocalOperation<T>(type: 'insert' | 'delete' | 'update', path: string[], value?: T): void {
    const op = createOperation(type, path, value, this.config.clientId, this.document.vectorClock);

    this.document = applyOperation(this.document, op);
    this.pendingOps.push(op);

    this.emit({ type: 'operation', payload: op });

    if (this.status === 'connected') {
      this.sendOperation(op);
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'sync':
          this.handleSync(message);
          break;
        case 'operation':
          this.handleRemoteOperation(message.operation);
          break;
        case 'ack':
          this.handleAck(message.operationId);
          break;
      }
    } catch (error) {
      console.error('Failed to parse sync message:', error);
    }
  }

  private handleSync(message: { data: unknown; serverClock: VectorClock }): void {
    this.document = {
      ...this.document,
      data: message.data,
      serverVectorClock: message.serverClock,
    };

    this.document.vectorClock = mergeClocks(this.document.vectorClock, message.serverClock);

    this.emit({ type: 'sync', payload: message });
  }

  private handleRemoteOperation(op: CRDTOperation): void {
    if (op.clientId === this.config.clientId) {
      return;
    }

    this.document = applyOperation(this.document, op);
    this.document.serverVectorClock = mergeClocks(this.document.serverVectorClock, op.vectorClock);

    this.emit({ type: 'operation', payload: op });
  }

  private handleAck(operationId: string): void {
    this.pendingOps = this.pendingOps.filter((op) => op.id !== operationId);
  }

  private sendOperation(op: CRDTOperation): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'operation',
          operation: op,
        })
      );
    }
  }

  private flushPendingOperations(): void {
    this.setStatus('syncing');

    for (const op of this.pendingOps) {
      this.sendOperation(op);
    }

    this.setStatus('connected');
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
  }

  private emit(event: SyncEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Sync event handler error:', error);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay!
    );

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
