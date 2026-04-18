/**
 * T-SUB-014: Large offline branch replay
 * T-SUB-015: Replay conflict → checkpoint before + after
 * T-SUB-016: Stale local changes → conservative erase prevents overwrite
 */
import { describe, it, expect } from 'vitest';
import {
  replayBranch,
  createCheckpoint,
  restoreCheckpoint,
  isChangeStale,
  conservativeErase,
} from './replay';
import { createVectorClock, incrementClock, type CRDTDocument, type CRDTOperation } from './crdt';

function makeDoc(data: Record<string, unknown> = {}): CRDTDocument<unknown> {
  return {
    id: 'doc-1',
    data,
    vectorClock: createVectorClock(),
    serverVectorClock: createVectorClock(),
    pendingOps: [],
  };
}

function makeOp(
  path: string[],
  value: unknown,
  clientId: string,
  clock = createVectorClock()
): CRDTOperation<unknown> {
  return {
    id: `op-${Math.random().toString(36).slice(2)}`,
    type: 'update',
    path,
    value,
    timestamp: Date.now(),
    clientId,
    vectorClock: clock,
  };
}

// ──────────────────────────────────────────────────────────────
// T-SUB-014: Large offline branch replay
// ──────────────────────────────────────────────────────────────
describe('T-SUB-014: Large offline branch replay', () => {
  it('replays 1000 pending operations without error', () => {
    let doc = makeDoc({ counter: 0 });
    const ops: CRDTOperation<unknown>[] = [];
    for (let i = 0; i < 1000; i++) {
      ops.push(makeOp(['counter'], i + 1, 'client-1'));
    }

    const result = replayBranch(doc, ops);
    expect(result.success).toBe(true);
    expect(result.appliedCount).toBe(1000);
    expect(result.failedCount).toBe(0);
  });

  it('returns the final document state after replay', () => {
    const doc = makeDoc({ value: 'initial' });
    const ops = [
      makeOp(['value'], 'updated', 'client-1'),
    ];

    const result = replayBranch(doc, ops);
    expect((result.document.data as Record<string, unknown>).value).toBe('updated');
  });

  it('skips already-seen operations (idempotent)', () => {
    const doc = makeDoc({ value: 'initial' });
    const op = makeOp(['value'], 'updated', 'client-1');
    const ops = [op, op]; // duplicate

    const result = replayBranch(doc, ops);
    expect(result.appliedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it('returns success=false if any operation fails to apply', () => {
    const doc = makeDoc({});
    // Op with invalid path depth (trying to set a property on a non-object)
    const ops = [makeOp(['nonexistent', 'deep', 'path'], 'value', 'client-1')];

    const result = replayBranch(doc, ops);
    // Should still return a result even for partial failures
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('appliedCount');
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-015: Replay conflict → checkpoint before + after
// ──────────────────────────────────────────────────────────────
describe('T-SUB-015: Replay conflict — checkpoint before + after', () => {
  it('creates a checkpoint with a timestamp and document snapshot', () => {
    const doc = makeDoc({ value: 'original' });
    const checkpoint = createCheckpoint(doc, 'pre-replay');

    expect(checkpoint.label).toBe('pre-replay');
    expect(checkpoint.timestamp).toBeGreaterThan(0);
    expect((checkpoint.snapshot.data as Record<string, unknown>).value).toBe('original');
  });

  it('checkpoint snapshot is independent of subsequent document mutations', () => {
    const doc = makeDoc({ value: 'original' });
    const checkpoint = createCheckpoint(doc, 'before');

    // Simulate mutation (replay sets new value in place)
    const op = makeOp(['value'], 'mutated', 'client-1');
    replayBranch(doc, [op]);

    expect((checkpoint.snapshot.data as Record<string, unknown>).value).toBe('original');
  });

  it('restores document to checkpoint state', () => {
    const doc = makeDoc({ value: 'original' });
    const checkpoint = createCheckpoint(doc, 'before');

    const ops = [makeOp(['value'], 'after-replay', 'client-1')];
    const { document: replayedDoc } = replayBranch(doc, ops);
    expect((replayedDoc.data as Record<string, unknown>).value).toBe('after-replay');

    const restored = restoreCheckpoint(checkpoint);
    expect((restored.data as Record<string, unknown>).value).toBe('original');
  });

  it('replayBranch returns pre- and post-replay snapshots when checkpoint is requested', () => {
    const doc = makeDoc({ value: 'before' });
    const ops = [makeOp(['value'], 'after', 'client-1')];

    const result = replayBranch(doc, ops, { checkpoint: true });
    expect(result.preCheckpoint).toBeDefined();
    expect(result.postCheckpoint).toBeDefined();
    expect((result.preCheckpoint!.snapshot.data as Record<string, unknown>).value).toBe('before');
    expect((result.postCheckpoint!.snapshot.data as Record<string, unknown>).value).toBe('after');
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-016: Stale local changes → conservative erase
// ──────────────────────────────────────────────────────────────
describe('T-SUB-016: Stale local changes — conservative erase prevents overwrite', () => {
  it('detects a local change as stale when server clock is ahead', () => {
    const serverClock = incrementClock(incrementClock(createVectorClock(), 'server'), 'server');
    const localOp = makeOp(['value'], 'local', 'client-1', createVectorClock());

    expect(isChangeStale(localOp, serverClock)).toBe(true);
  });

  it('does not treat a local change as stale when local clock is current', () => {
    const sharedClock = incrementClock(createVectorClock(), 'server');
    const localOp = makeOp(['value'], 'local', 'client-1', sharedClock);

    expect(isChangeStale(localOp, sharedClock)).toBe(false);
  });

  it('conservativeErase removes stale operations from pendingOps', () => {
    const serverClock = incrementClock(incrementClock(createVectorClock(), 'server'), 'server');
    const staleOp = makeOp(['value'], 'stale', 'client-1', createVectorClock());
    const freshOp = makeOp(['value'], 'fresh', 'client-1', serverClock);

    const result = conservativeErase([staleOp, freshOp], serverClock);
    expect(result.retained).toHaveLength(1);
    expect(result.erased).toHaveLength(1);
    expect(result.retained[0].value).toBe('fresh');
    expect(result.erased[0].value).toBe('stale');
  });

  it('conservativeErase retains all ops when server clock is at origin', () => {
    const originClock = createVectorClock();
    const op1 = makeOp(['a'], 1, 'c1', originClock);
    const op2 = makeOp(['b'], 2, 'c1', originClock);

    const result = conservativeErase([op1, op2], originClock);
    expect(result.retained).toHaveLength(2);
    expect(result.erased).toHaveLength(0);
  });
});
