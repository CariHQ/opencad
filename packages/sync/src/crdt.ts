/**
 * CRDT Implementation
 * Conflict-free Replicated Data Types for real-time collaboration
 */

export type OperationType = 'insert' | 'delete' | 'update';

export interface CRDTOperation<T = unknown> {
  id: string;
  type: OperationType;
  path: string[];
  value?: T;
  timestamp: number;
  clientId: string;
  vectorClock: Record<string, number>;
}

export interface VectorClock {
  clock: Record<string, number>;
}

export interface CRDTDocument<T = unknown> {
  id: string;
  data: T;
  vectorClock: VectorClock;
  pendingOps: CRDTOperation[];
  serverVectorClock: VectorClock;
}

export function createVectorClock(): VectorClock {
  return { clock: {} };
}

export function incrementClock(clock: VectorClock, clientId: string): VectorClock {
  const newClock = { ...clock.clock };
  newClock[clientId] = (newClock[clientId] || 0) + 1;
  return { clock: newClock };
}

export function mergeClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(a.clock), ...Object.keys(b.clock)]);

  for (const key of allKeys) {
    merged[key] = Math.max(a.clock[key] || 0, b.clock[key] || 0);
  }

  return { clock: merged };
}

export function compareClocks(a: VectorClock, b: VectorClock): -1 | 0 | 1 | null {
  const allKeys = new Set([...Object.keys(a.clock), ...Object.keys(b.clock)]);
  let aGreater = false;
  let bGreater = false;

  for (const key of allKeys) {
    const aVal = a.clock[key] || 0;
    const bVal = b.clock[key] || 0;

    if (aVal > bVal) aGreater = true;
    if (bVal > aVal) bGreater = true;
  }

  if (aGreater && !bGreater) return 1;
  if (bGreater && !aGreater) return -1;
  if (!aGreater && !bGreater) return 0;
  return null;
}

export function createOperation<T>(
  type: OperationType,
  path: string[],
  value: T | undefined,
  clientId: string,
  clock: VectorClock
): CRDTOperation<T> {
  return {
    id: crypto.randomUUID(),
    type,
    path,
    value,
    timestamp: Date.now(),
    clientId,
    vectorClock: { ...clock },
  };
}

export function applyOperation<T>(doc: CRDTDocument<T>, op: CRDTOperation<T>): CRDTDocument<T> {
  const newDoc = { ...doc, data: deepClone(doc.data) };
  const path = op.path;

  if (path.length === 0) {
    if (op.type === 'update' && op.value !== undefined) {
      newDoc.data = op.value;
    }
    return newDoc;
  }

  let current: unknown = newDoc.data;
  for (let i = 0; i < path.length - 1; i++) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[path[i]];
    }
  }

  if (current && typeof current === 'object') {
    switch (op.type) {
      case 'insert':
      case 'update':
        if (op.value !== undefined) {
          (current as Record<string, unknown>)[path[path.length - 1]] = op.value;
        }
        break;
      case 'delete':
        delete (current as Record<string, unknown>)[path[path.length - 1]];
        break;
    }
  }

  newDoc.vectorClock = incrementClock(newDoc.vectorClock, op.clientId);
  newDoc.pendingOps = newDoc.pendingOps.filter((p) => p.id !== op.id);

  return newDoc;
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }

  return cloned as T;
}

export function canMerge(op1: CRDTOperation, op2: CRDTOperation): boolean {
  const comp = compareClocks(op1.vectorClock, op2.vectorClock);

  if (comp === 0) {
    return op1.id < op2.id;
  }

  return comp === -1;
}

export function mergeOperations<T>(
  ops1: CRDTOperation<T>[],
  ops2: CRDTOperation<T>[]
): CRDTOperation<T>[] {
  const all = [...ops1, ...ops2];
  const sorted = all.sort((a, b) => {
    const comp = compareClocks(a.vectorClock, b.vectorClock);
    if (comp === -1) return 1;
    if (comp === 1) return -1;
    return a.timestamp - b.timestamp;
  });

  const merged: CRDTOperation<T>[] = [];
  const seen = new Set<string>();

  for (const op of sorted) {
    if (seen.has(op.id)) continue;

    const conflicting = merged.some(
      (existing) =>
        pathsOverlap(existing.path, op.path) &&
        existing.clientId !== op.clientId &&
        compareClocks(existing.vectorClock, op.vectorClock) === null
    );

    if (!conflicting) {
      merged.push(op);
      seen.add(op.id);
    }
  }

  return merged;
}

function pathsOverlap(a: string[], b: string[]): boolean {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
