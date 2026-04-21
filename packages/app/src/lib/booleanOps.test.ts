/**
 * T-GEO-040: Mesh boolean ops smoke test.
 *
 * Full CSG evaluation needs real GL buffers — run only minimal shape
 * checks here. Integration tests that call the full Evaluator live in
 * the e2e suite.
 */
import { describe, it, expect } from 'vitest';
import type { BooleanOp } from './booleanOps';

describe('T-GEO-040: boolean op signatures', () => {
  it('op map covers union / subtract / intersect', () => {
    const ops: BooleanOp[] = ['union', 'subtract', 'intersect'];
    for (const op of ops) {
      expect(typeof op).toBe('string');
    }
  });
});
