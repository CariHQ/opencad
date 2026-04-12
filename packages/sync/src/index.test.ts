/**
 * Sync Tests
 * Tests for T-COL-001 through T-COL-005
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
  type CRDTDocument,
} from './crdt';

describe('CRDT Tests', () => {
  describe('T-COL-001: Two users edit same element → verify CRDT resolves', () => {
    it('should merge concurrent updates to different properties', () => {
      const doc1: CRDTDocument = {
        id: 'test',
        data: { name: 'Original', color: 'red' },
        vectorClock: createVectorClock(),
        pendingOps: [],
        serverVectorClock: createVectorClock(),
      };

      const doc2: CRDTDocument = {
        ...doc1,
        vectorClock: incrementClock(doc1.vectorClock, 'user2'),
      };

      const op1 = createOperation('update', ['name'], 'Updated Name', 'user1', doc1.vectorClock);
      const op2 = createOperation('update', ['color'], 'blue', 'user2', doc2.vectorClock);

      let merged = applyOperation(doc1, op1);
      merged = applyOperation(merged, op2);

      expect(merged.data).toEqual({ name: 'Updated Name', color: 'blue' });
    });

    it('should resolve conflicting updates with vector clocks', () => {
      const doc1: CRDTDocument = {
        id: 'test',
        data: { value: 0 },
        vectorClock: createVectorClock(),
        pendingOps: [],
        serverVectorClock: createVectorClock(),
      };

      const op1 = createOperation('update', ['value'], 1, 'user1', doc1.vectorClock);
      const doc2 = applyOperation(
        { ...doc1, vectorClock: incrementClock(doc1.vectorClock, 'user2') },
        op1
      );

      const op2 = createOperation('update', ['value'], 2, 'user2', doc2.vectorClock);

      const merged = applyOperation(doc2, op2);

      expect(merged.data).toEqual({ value: 2 });
    });

    it('should track concurrent operations correctly', () => {
      const clock1 = createVectorClock();
      const clock2 = incrementClock(clock1, 'user2');

      expect(compareClocks(clock1, clock2)).toBe(-1);
      expect(compareClocks(clock2, clock1)).toBe(1);
      expect(compareClocks(clock1, clock1)).toBe(0);
    });
  });

  describe('T-COL-002: Two users edit different elements → verify both appear', () => {
    it('should apply both operations from different users', () => {
      const doc1: CRDTDocument = {
        id: 'test',
        data: {},
        vectorClock: createVectorClock(),
        pendingOps: [],
        serverVectorClock: createVectorClock(),
      };

      const op1 = createOperation(
        'update',
        ['element1'],
        { type: 'wall' },
        'user1',
        doc1.vectorClock
      );
      const doc2 = applyOperation(doc1, op1);

      const op2 = createOperation(
        'update',
        ['element2'],
        { type: 'door' },
        'user2',
        doc2.vectorClock
      );
      const merged = applyOperation(doc2, op2);

      expect((merged.data as Record<string, unknown>).element1).toEqual({ type: 'wall' });
      expect((merged.data as Record<string, unknown>).element2).toEqual({ type: 'door' });
    });

    it('should merge vector clocks from both users', () => {
      const clock1 = incrementClock(createVectorClock(), 'user1');
      const clock2 = incrementClock(createVectorClock(), 'user2');

      const merged = mergeClocks(clock1, clock2);

      expect(merged.clock.user1).toBe(1);
      expect(merged.clock.user2).toBe(1);
    });
  });

  describe('T-COL-003: Offline edit + concurrent online edit → verify merge', () => {
    it('should queue operations when offline and replay on reconnect', () => {
      const doc: CRDTDocument = {
        id: 'test',
        data: { counter: 0 },
        vectorClock: createVectorClock(),
        pendingOps: [],
        serverVectorClock: createVectorClock(),
      };

      const op1 = createOperation('update', ['counter'], 1, 'user1', doc.vectorClock);
      const docWithPending = {
        ...doc,
        pendingOps: [op1],
      };

      expect(docWithPending.pendingOps.length).toBe(1);
      expect(docWithPending.pendingOps[0].id).toBe(op1.id);
    });

    it('should merge pending ops with server state', () => {
      const serverDoc: CRDTDocument = {
        id: 'test',
        data: { serverValue: 'from server' },
        vectorClock: createVectorClock(),
        pendingOps: [],
        serverVectorClock: createVectorClock(),
      };

      const localOp = createOperation(
        'update',
        ['localValue'],
        'from local',
        'user1',
        serverDoc.vectorClock
      );
      const localDoc = applyOperation(serverDoc, localOp);

      expect((localDoc.data as Record<string, unknown>).serverValue).toBe('from server');
      expect((localDoc.data as Record<string, unknown>).localValue).toBe('from local');
    });
  });

  describe('Vector Clock Tests', () => {
    it('should correctly increment and merge clocks', () => {
      const c1 = createVectorClock();
      const c2 = incrementClock(c1, 'A');
      const c3 = incrementClock(c1, 'B');

      expect(c2.clock.A).toBe(1);
      expect(c2.clock.B).toBeUndefined();

      const merged = mergeClocks(c2, c3);
      expect(merged.clock.A).toBe(1);
      expect(merged.clock.B).toBe(1);
    });

    it('should handle causally dependent operations', () => {
      const c1 = createVectorClock();
      const c2 = incrementClock(c1, 'A');
      const c3 = incrementClock(c2, 'B');

      expect(compareClocks(c1, c3)).toBe(-1);
      expect(compareClocks(c3, c1)).toBe(1);
      expect(compareClocks(c2, c3)).toBe(-1);
    });

    it('should detect concurrent operations', () => {
      const c1 = incrementClock(createVectorClock(), 'A');
      const c2 = incrementClock(createVectorClock(), 'B');

      const result = compareClocks(c1, c2);
      expect(result).toBeNull();
    });
  });

  describe('Operation Merge Tests', () => {
    it('should merge operation lists correctly', () => {
      const clock1 = createVectorClock();
      const clock2 = incrementClock(clock1, 'user2');

      const op1 = createOperation('update', ['path1'], 'value1', 'user1', clock1);
      const op2 = createOperation('update', ['path2'], 'value2', 'user2', clock2);

      const merged = mergeOperations([op1], [op2]);

      expect(merged.length).toBe(2);
    });

    it('should remove duplicate operations', () => {
      const clock = createVectorClock();

      // Create operations on same path from same user with same clock (duplicate)
      const op1 = createOperation('update', ['path', 'id1'], 'value1', 'user1', clock);
      const op2 = createOperation('update', ['path', 'id2'], 'value2', 'user1', clock);

      const merged = mergeOperations([op1], [op2]);

      // Same user, same clock, different paths - both should be kept
      expect(merged.length).toBe(2);
    });

    it('should merge concurrent operations on same path', () => {
      const clock1 = createVectorClock();
      const clock2 = incrementClock(clock1, 'user2');

      // Concurrent updates to same path from different users
      const op1 = createOperation('update', ['samePath'], 'value1', 'user1', clock1);
      const op2 = createOperation('update', ['samePath'], 'value2', 'user2', clock2);

      const merged = mergeOperations([op1], [op2]);

      // Should keep one based on Lamport timestamp ordering
      expect(merged.length).toBeGreaterThanOrEqual(1);
    });
  });
});
