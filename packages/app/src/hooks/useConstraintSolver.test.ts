/**
 * useConstraintSolver tests
 * T-2D-009: Geometric constraint solving
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConstraintSolver } from './useConstraintSolver';

describe('T-2D-009: Geometric constraint solver', () => {
  // ─── Basic setup ──────────────────────────────────────────────────────────

  it('starts with empty state', () => {
    const { result } = renderHook(() => useConstraintSolver());
    expect(result.current.state.constraints).toHaveLength(0);
    expect(result.current.state.points).toHaveLength(0);
    expect(result.current.state.isSolved).toBe(false);
  });

  it('can add points', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0);
      result.current.addPoint('p2', 100, 0);
    });
    expect(result.current.state.points).toHaveLength(2);
  });

  it('can add constraints', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0);
      result.current.addPoint('p2', 100, 5);
    });
    act(() => {
      result.current.addConstraint('horizontal', ['p1', 'p2']);
    });
    expect(result.current.state.constraints).toHaveLength(1);
    expect(result.current.state.constraints[0].type).toBe('horizontal');
  });

  it('can remove constraints', () => {
    const { result } = renderHook(() => useConstraintSolver());
    let cid: string = '';
    act(() => {
      cid = result.current.addConstraint('horizontal', ['p1', 'p2']);
    });
    act(() => {
      result.current.removeConstraint(cid);
    });
    expect(result.current.state.constraints).toHaveLength(0);
  });

  // ─── Solve: horizontal constraint ─────────────────────────────────────────

  it('horizontal constraint makes two points have same Y', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0, true);  // fixed
      result.current.addPoint('p2', 100, 50);      // free
    });
    act(() => {
      result.current.addConstraint('horizontal', ['p2', 'p1']);
    });
    act(() => {
      result.current.solve();
    });
    const p2 = result.current.state.points.find((p) => p.id === 'p2');
    expect(p2?.y).toBeCloseTo(0, 3);
    expect(result.current.state.isSolved).toBe(true);
  });

  // ─── Solve: vertical constraint ───────────────────────────────────────────

  it('vertical constraint makes two points have same X', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 50, 0, true);
      result.current.addPoint('p2', 100, 100);
    });
    act(() => {
      result.current.addConstraint('vertical', ['p2', 'p1']);
    });
    act(() => {
      result.current.solve();
    });
    const p2 = result.current.state.points.find((p) => p.id === 'p2');
    expect(p2?.x).toBeCloseTo(50, 3);
    expect(result.current.state.isSolved).toBe(true);
  });

  // ─── Solve: coincident constraint ─────────────────────────────────────────

  it('coincident constraint moves free point to fixed point', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 10, 20, true);
      result.current.addPoint('p2', 50, 80);
    });
    act(() => {
      result.current.addConstraint('coincident', ['p2', 'p1']);
    });
    act(() => {
      result.current.solve();
    });
    const p2 = result.current.state.points.find((p) => p.id === 'p2');
    expect(p2?.x).toBeCloseTo(10, 3);
    expect(p2?.y).toBeCloseTo(20, 3);
  });

  // ─── Solve: midpoint constraint ───────────────────────────────────────────

  it('midpoint constraint places point at segment midpoint', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0, true);   // start
      result.current.addPoint('p2', 100, 0, true); // end
      result.current.addPoint('pm', 60, 30);        // free midpoint
    });
    act(() => {
      result.current.addConstraint('midpoint', ['pm', 'p1', 'p2']);
    });
    act(() => {
      result.current.solve();
    });
    const pm = result.current.state.points.find((p) => p.id === 'pm');
    expect(pm?.x).toBeCloseTo(50, 3);
    expect(pm?.y).toBeCloseTo(0, 3);
  });

  // ─── Solve: distance constraint ───────────────────────────────────────────

  it('distance constraint enforces exact distance between points', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0, true);
      result.current.addPoint('p2', 80, 60);  // currently 100 away
    });
    act(() => {
      result.current.addConstraint('distance', ['p2', 'p1'], 50);
    });
    act(() => {
      result.current.solve();
    });
    const p1 = result.current.state.points.find((p) => p.id === 'p1')!;
    const p2 = result.current.state.points.find((p) => p.id === 'p2')!;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(50, 3);
  });

  // ─── Degrees of freedom ───────────────────────────────────────────────────

  it('DOF = 2 × points when no constraints', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0);
      result.current.addPoint('p2', 100, 0);
    });
    expect(result.current.degreesOfFreedom).toBe(4); // 2 pts × 2
  });

  it('DOF decreases when constraints added', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0);
      result.current.addPoint('p2', 100, 0);
    });
    const dofBefore = result.current.degreesOfFreedom;
    act(() => {
      result.current.addConstraint('horizontal', ['p1', 'p2']);
    });
    expect(result.current.degreesOfFreedom).toBeLessThan(dofBefore);
  });

  it('fixed point removes all DOF for that point', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0, true);
    });
    act(() => {
      result.current.addConstraint('fixed', ['p1']);
    });
    act(() => {
      result.current.solve();
    });
    const p1 = result.current.state.points.find((p) => p.id === 'p1')!;
    expect(p1.fixed).toBe(true);
  });

  // ─── Over/under constrained detection ────────────────────────────────────

  it('isUnderConstrained when DOF > 0 and no conflicts', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0);
    });
    expect(result.current.isUnderConstrained).toBe(true);
    expect(result.current.isOverConstrained).toBe(false);
  });

  // ─── Reset ────────────────────────────────────────────────────────────────

  it('reset clears all state', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0);
      result.current.addConstraint('fixed', ['p1']);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.points).toHaveLength(0);
    expect(result.current.state.constraints).toHaveLength(0);
  });

  // ─── Update point ─────────────────────────────────────────────────────────

  it('updatePoint changes point position', () => {
    const { result } = renderHook(() => useConstraintSolver());
    act(() => {
      result.current.addPoint('p1', 0, 0);
    });
    act(() => {
      result.current.updatePoint('p1', 150, 200);
    });
    const p1 = result.current.state.points.find((p) => p.id === 'p1');
    expect(p1?.x).toBe(150);
    expect(p1?.y).toBe(200);
  });
});
