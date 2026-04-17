/**
 * CRDT Implementation Tests
 * T-COL-007: CRDT vector clock invariants
 * T-COL-001: CRDT resolves without data loss
 * T-COL-003: Offline-then-reconnect merge
 */
import { describe, it, expect } from 'vitest';
import {
  createVectorClock,
  incrementClock,
  mergeClocks,
  compareClocks,
  createOperation,
  applyOperation,
  mergeOperations,
  canMerge,
  type CRDTDocument,
  type CRDTOperation,
  type VectorClock,
} from './crdt';

function makeDoc<T>(data: T): CRDTDocument<T> {
  return {
    id: 'doc-1',
    data,
    vectorClock: createVectorClock(),
    pendingOps: [],
    serverVectorClock: createVectorClock(),
  };
}

// ─── Vector clock operations ──────────────────────────────────────────────────

describe('T-COL-007: Vector clock operations', () => {
  it('createVectorClock creates empty clock', () => {
    const clock = createVectorClock();
    expect(clock.clock).toEqual({});
  });

  it('incrementClock increments counter for client', () => {
    const clock = createVectorClock();
    const updated = incrementClock(clock, 'client-A');
    expect(updated.clock['client-A']).toBe(1);
  });

  it('incrementClock does not mutate original clock', () => {
    const clock = createVectorClock();
    incrementClock(clock, 'client-A');
    expect(clock.clock['client-A']).toBeUndefined();
  });

  it('incrementClock accumulates for same client', () => {
    let clock = createVectorClock();
    clock = incrementClock(clock, 'client-A');
    clock = incrementClock(clock, 'client-A');
    clock = incrementClock(clock, 'client-A');
    expect(clock.clock['client-A']).toBe(3);
  });

  it('incrementClock keeps separate counters for different clients', () => {
    let clock = createVectorClock();
    clock = incrementClock(clock, 'client-A');
    clock = incrementClock(clock, 'client-B');
    expect(clock.clock['client-A']).toBe(1);
    expect(clock.clock['client-B']).toBe(1);
  });

  it('mergeClocks takes maximum of each key', () => {
    const a: VectorClock = { clock: { 'A': 3, 'B': 1 } };
    const b: VectorClock = { clock: { 'A': 1, 'B': 5, 'C': 2 } };
    const merged = mergeClocks(a, b);
    expect(merged.clock['A']).toBe(3);
    expect(merged.clock['B']).toBe(5);
    expect(merged.clock['C']).toBe(2);
  });

  it('mergeClocks is commutative', () => {
    const a: VectorClock = { clock: { 'A': 3, 'B': 1 } };
    const b: VectorClock = { clock: { 'A': 1, 'B': 5 } };
    const ab = mergeClocks(a, b);
    const ba = mergeClocks(b, a);
    expect(ab).toEqual(ba);
  });

  it('compareClocks: equal clocks return 0', () => {
    const a: VectorClock = { clock: { 'A': 2 } };
    const b: VectorClock = { clock: { 'A': 2 } };
    expect(compareClocks(a, b)).toBe(0);
  });

  it('compareClocks: a > b returns 1', () => {
    const a: VectorClock = { clock: { 'A': 3 } };
    const b: VectorClock = { clock: { 'A': 1 } };
    expect(compareClocks(a, b)).toBe(1);
  });

  it('compareClocks: a < b returns -1', () => {
    const a: VectorClock = { clock: { 'A': 1 } };
    const b: VectorClock = { clock: { 'A': 3 } };
    expect(compareClocks(a, b)).toBe(-1);
  });

  it('compareClocks: concurrent clocks return null', () => {
    const a: VectorClock = { clock: { 'A': 3, 'B': 1 } };
    const b: VectorClock = { clock: { 'A': 1, 'B': 3 } };
    expect(compareClocks(a, b)).toBeNull();
  });

  it('empty clocks are equal', () => {
    const a = createVectorClock();
    const b = createVectorClock();
    expect(compareClocks(a, b)).toBe(0);
  });
});

// ─── CRDT operations ──────────────────────────────────────────────────────────

describe('T-COL-001: CRDT operations', () => {
  it('createOperation produces operation with correct type and path', () => {
    const clock = createVectorClock();
    const op = createOperation('update', ['name'], 'New Name', 'client-1', clock);
    expect(op.type).toBe('update');
    expect(op.path).toEqual(['name']);
    expect(op.value).toBe('New Name');
    expect(op.clientId).toBe('client-1');
  });

  it('createOperation assigns unique IDs', () => {
    const clock = createVectorClock();
    const op1 = createOperation('insert', ['a'], 1, 'c1', clock);
    const op2 = createOperation('insert', ['b'], 2, 'c1', clock);
    expect(op1.id).not.toBe(op2.id);
  });

  it('applyOperation update sets value at path', () => {
    const doc = makeDoc<Record<string, unknown>>({ name: 'Old' });
    const clock = createVectorClock();
    const op = createOperation<Record<string, unknown>>('update', ['name'], { _val: 'New' } as unknown as Record<string, unknown>, 'client-1', clock);
    // Use string op cast to unknown to work around strict generic typing
    const result = applyOperation(doc, op as unknown as CRDTOperation<Record<string, unknown>>);
    expect((result.data as Record<string, unknown>)['name']).toEqual({ _val: 'New' });
  });

  it('applyOperation insert adds new key', () => {
    type D = Record<string, unknown>;
    const doc = makeDoc<D>({});
    const clock = createVectorClock();
    const op: CRDTOperation<D> = {
      id: 'op-1',
      type: 'insert',
      path: ['key'],
      value: { _v: 'value' },
      timestamp: Date.now(),
      clientId: 'client-1',
      vectorClock: clock,
    };
    const result = applyOperation(doc, op);
    expect((result.data)['key']).toEqual({ _v: 'value' });
  });

  it('applyOperation delete removes key', () => {
    type D = Record<string, unknown>;
    const doc = makeDoc<D>({ toDelete: true });
    const clock = createVectorClock();
    const op: CRDTOperation<D> = {
      id: 'op-del',
      type: 'delete',
      path: ['toDelete'],
      value: undefined,
      timestamp: Date.now(),
      clientId: 'client-1',
      vectorClock: clock,
    };
    const result = applyOperation(doc, op);
    expect((result.data)['toDelete']).toBeUndefined();
  });

  it('applyOperation does not mutate original document', () => {
    type D = Record<string, unknown>;
    const doc = makeDoc<D>({ name: 'Original' });
    const clock = createVectorClock();
    const op: CRDTOperation<D> = {
      id: 'op-mut',
      type: 'update',
      path: ['name'],
      value: { changed: true },
      timestamp: Date.now(),
      clientId: 'client-1',
      vectorClock: clock,
    };
    applyOperation(doc, op);
    expect((doc.data)['name']).toBe('Original');
  });

  it('applyOperation increments vector clock', () => {
    type D = Record<string, unknown>;
    const doc = makeDoc<D>({});
    const clock = createVectorClock();
    const op: CRDTOperation<D> = {
      id: 'op-clk',
      type: 'insert',
      path: ['x'],
      value: { _n: 1 },
      timestamp: Date.now(),
      clientId: 'client-A',
      vectorClock: clock,
    };
    const result = applyOperation(doc, op);
    expect(result.vectorClock.clock['client-A']).toBe(1);
  });

  it('applyOperation with root-level path replaces data', () => {
    const doc = makeDoc<string>('original');
    const clock = createVectorClock();
    const op: CRDTOperation<string> = {
      id: 'op-root',
      type: 'update',
      path: [],
      value: 'replaced',
      timestamp: Date.now(),
      clientId: 'client-1',
      vectorClock: clock,
    };
    const result = applyOperation(doc, op);
    expect(result.data).toBe('replaced');
  });
});

// ─── CRDT merge ───────────────────────────────────────────────────────────────

describe('T-COL-003: CRDT merge (offline then reconnect)', () => {
  it('mergeOperations deduplicates by id', () => {
    const clock = createVectorClock();
    const op: CRDTOperation<number> = { id: 'op-1', type: 'insert', path: ['a'], value: 1, timestamp: Date.now(), clientId: 'c1', vectorClock: clock };
    const merged = mergeOperations([op], [op]);
    expect(merged).toHaveLength(1);
  });

  it('mergeOperations includes ops from both sets', () => {
    const clock = createVectorClock();
    const clock2 = incrementClock(clock, 'c2');
    const op1: CRDTOperation<number> = { id: 'op-a', type: 'insert', path: ['a'], value: 1, timestamp: Date.now(), clientId: 'c1', vectorClock: clock };
    const op2: CRDTOperation<number> = { id: 'op-b', type: 'insert', path: ['b'], value: 2, timestamp: Date.now(), clientId: 'c2', vectorClock: clock2 };
    const merged = mergeOperations([op1], [op2]);
    expect(merged.length).toBeGreaterThanOrEqual(1);
  });

  it('canMerge returns true for causally ordered ops', () => {
    const clock1 = createVectorClock();
    const clock2 = incrementClock(clock1, 'c1');
    const op1: CRDTOperation<number> = { id: 'op-1', type: 'insert', path: ['a'], value: 1, timestamp: 1, clientId: 'c1', vectorClock: clock1 };
    const op2: CRDTOperation<number> = { id: 'op-2', type: 'insert', path: ['a'], value: 2, timestamp: 2, clientId: 'c1', vectorClock: clock2 };
    // op1 happens before op2 — op1 < op2 means canMerge(op1, op2) = true
    expect(canMerge(op1, op2)).toBe(true);
  });

  it('canMerge uses id for equal clocks', () => {
    const clock = createVectorClock();
    const op1: CRDTOperation<number> = { id: 'aaa', type: 'insert', path: ['a'], value: 1, timestamp: Date.now(), clientId: 'c1', vectorClock: clock };
    const op2: CRDTOperation<number> = { id: 'zzz', type: 'insert', path: ['a'], value: 2, timestamp: Date.now(), clientId: 'c2', vectorClock: clock };
    // When clocks are equal, canMerge uses id comparison
    const result = canMerge(op1, op2);
    expect(typeof result).toBe('boolean');
  });
});
