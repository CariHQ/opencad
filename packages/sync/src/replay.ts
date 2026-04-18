/**
 * Branch Replay & Checkpoint
 * T-SUB-014: Large offline branch replay
 * T-SUB-015: Replay conflict checkpoint
 * T-SUB-016: Conservative erase of stale local changes
 */
import {
  applyOperation,
  compareClocks,
  type CRDTDocument,
  type CRDTOperation,
  type VectorClock,
} from './crdt';

export interface Checkpoint<T = unknown> {
  label: string;
  timestamp: number;
  snapshot: CRDTDocument<T>;
}

export interface ReplayOptions {
  checkpoint?: boolean;
}

export interface ReplayResult<T = unknown> {
  success: boolean;
  document: CRDTDocument<T>;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  preCheckpoint?: Checkpoint<T>;
  postCheckpoint?: Checkpoint<T>;
}

/** Replay a list of operations against a document, deduplicating by op ID. */
export function replayBranch<T>(
  doc: CRDTDocument<T>,
  ops: CRDTOperation<T>[],
  options: ReplayOptions = {}
): ReplayResult<T> {
  const preCheckpoint = options.checkpoint ? createCheckpoint(doc, 'pre-replay') : undefined;

  const seen = new Set<string>();
  let appliedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let current = doc;

  for (const op of ops) {
    if (seen.has(op.id)) {
      skippedCount++;
      continue;
    }
    seen.add(op.id);

    try {
      current = applyOperation(current, op);
      appliedCount++;
    } catch {
      failedCount++;
    }
  }

  const postCheckpoint = options.checkpoint ? createCheckpoint(current, 'post-replay') : undefined;

  return {
    success: failedCount === 0,
    document: current,
    appliedCount,
    skippedCount,
    failedCount,
    preCheckpoint,
    postCheckpoint,
  };
}

/** Take a deep snapshot of a document at a named point in time. */
export function createCheckpoint<T>(doc: CRDTDocument<T>, label: string): Checkpoint<T> {
  return {
    label,
    timestamp: Date.now(),
    snapshot: deepCloneDoc(doc),
  };
}

/** Restore a document to the state captured in a checkpoint. */
export function restoreCheckpoint<T>(checkpoint: Checkpoint<T>): CRDTDocument<T> {
  return deepCloneDoc(checkpoint.snapshot);
}

/**
 * Returns true if a local operation is stale relative to the server clock.
 * A change is stale when the server clock has advanced past the local op's clock
 * on any dimension the local op was authored in.
 */
export function isChangeStale(op: CRDTOperation, serverClock: VectorClock): boolean {
  const cmp = compareClocks(op.vectorClock, serverClock);
  // If serverClock is ahead (cmp === -1 means op < server) → stale
  // If equal or op is ahead → not stale
  return cmp === -1;
}

export interface EraseResult<T = unknown> {
  retained: CRDTOperation<T>[];
  erased: CRDTOperation<T>[];
}

/**
 * Conservative erase: remove pending operations that are stale relative to the
 * server clock, preventing stale writes from overwriting newer server state.
 */
export function conservativeErase<T>(
  pendingOps: CRDTOperation<T>[],
  serverClock: VectorClock
): EraseResult<T> {
  const retained: CRDTOperation<T>[] = [];
  const erased: CRDTOperation<T>[] = [];

  for (const op of pendingOps) {
    if (isChangeStale(op, serverClock)) {
      erased.push(op);
    } else {
      retained.push(op);
    }
  }

  return { retained, erased };
}

function deepCloneDoc<T>(doc: CRDTDocument<T>): CRDTDocument<T> {
  return JSON.parse(JSON.stringify(doc)) as CRDTDocument<T>;
}
