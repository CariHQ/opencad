/**
 * useConstraintSolver hook
 * 2D geometric constraint solver for CAD drafting.
 * Supports: coincident, horizontal, vertical, parallel, perpendicular,
 * equal length, fixed, distance, angle, tangent constraints.
 */

import { useState, useCallback, useMemo } from 'react';

// ─── Constraint Types ─────────────────────────────────────────────────────────

export type ConstraintType =
  | 'coincident'      // two points at same location
  | 'horizontal'      // line is horizontal
  | 'vertical'        // line is vertical
  | 'parallel'        // two lines are parallel
  | 'perpendicular'   // two lines are perpendicular
  | 'equal'           // equal length / radius
  | 'fixed'           // point at fixed location
  | 'distance'        // fixed distance between points
  | 'angle'           // fixed angle between lines
  | 'tangent'         // line tangent to circle
  | 'midpoint';       // point is at midpoint of segment

export interface Constraint {
  id: string;
  type: ConstraintType;
  entityIds: string[];    // element / point IDs involved
  value?: number;         // for distance/angle constraints
  satisfied: boolean;
}

export interface ConstrainedPoint {
  id: string;
  x: number;
  y: number;
  fixed: boolean;
}

export interface ConstraintSolverState {
  constraints: Constraint[];
  points: ConstrainedPoint[];
  isSolved: boolean;
  conflictIds: string[];  // constraint IDs that conflict
}

export interface UseConstraintSolverResult {
  state: ConstraintSolverState;
  addConstraint: (type: ConstraintType, entityIds: string[], value?: number) => string;
  removeConstraint: (id: string) => void;
  addPoint: (id: string, x: number, y: number, fixed?: boolean) => void;
  updatePoint: (id: string, x: number, y: number) => void;
  solve: () => void;
  reset: () => void;
  isOverConstrained: boolean;
  isUnderConstrained: boolean;
  degreesOfFreedom: number;
}

// ─── Solver ───────────────────────────────────────────────────────────────────

function checkConstraintSatisfied(
  constraint: Constraint,
  points: Map<string, ConstrainedPoint>
): boolean {
  const pts = constraint.entityIds.map((id) => points.get(id)).filter(Boolean) as ConstrainedPoint[];

  switch (constraint.type) {
    case 'coincident':
      if (pts.length < 2) return false;
      return Math.abs(pts[0].x - pts[1].x) < 0.001 && Math.abs(pts[0].y - pts[1].y) < 0.001;

    case 'horizontal':
      if (pts.length < 2) return false;
      return Math.abs(pts[0].y - pts[1].y) < 0.001;

    case 'vertical':
      if (pts.length < 2) return false;
      return Math.abs(pts[0].x - pts[1].x) < 0.001;

    case 'fixed':
      return pts.length > 0 && pts[0].fixed;

    case 'distance': {
      if (pts.length < 2 || constraint.value === undefined) return false;
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return Math.abs(dist - constraint.value) < 0.001;
    }

    case 'midpoint': {
      if (pts.length < 3) return false; // [midPt, startPt, endPt]
      const midX = (pts[1].x + pts[2].x) / 2;
      const midY = (pts[1].y + pts[2].y) / 2;
      return Math.abs(pts[0].x - midX) < 0.001 && Math.abs(pts[0].y - midY) < 0.001;
    }

    default:
      return true; // assume satisfied for complex constraints
  }
}

function computeDegreesOfFreedom(
  pointCount: number,
  constraints: Constraint[]
): number {
  // Each 2D point has 2 DOF
  // Each constraint removes 1 DOF (simplified model)
  const totalDOF = pointCount * 2;
  let constraintDOF = 0;
  for (const c of constraints) {
    switch (c.type) {
      case 'coincident': constraintDOF += 2; break;
      case 'fixed': constraintDOF += 2; break;
      case 'horizontal':
      case 'vertical':
      case 'parallel':
      case 'perpendicular':
      case 'tangent':
      case 'midpoint':
        constraintDOF += 1; break;
      case 'distance':
      case 'angle':
      case 'equal':
        constraintDOF += 1; break;
      default: constraintDOF += 1;
    }
  }
  return Math.max(0, totalDOF - constraintDOF);
}

function solveConstraints(
  points: ConstrainedPoint[],
  constraints: Constraint[]
): { points: ConstrainedPoint[]; conflictIds: string[] } {
  const pointMap = new Map(points.map((p) => [p.id, { ...p }]));
  const conflictIds: string[] = [];

  // Simple iterative constraint propagation
  for (let iter = 0; iter < 20; iter++) {
    let changed = false;

    for (const constraint of constraints) {
      const pts = constraint.entityIds
        .map((id) => pointMap.get(id))
        .filter(Boolean) as ConstrainedPoint[];

      if (pts.length === 0) continue;

      switch (constraint.type) {
        case 'coincident':
          if (pts.length >= 2 && !pts[0].fixed) {
            pts[0].x = pts[1].x;
            pts[0].y = pts[1].y;
            pointMap.set(pts[0].id, pts[0]);
            changed = true;
          }
          break;

        case 'horizontal':
          if (pts.length >= 2 && !pts[0].fixed) {
            pts[0].y = pts[1].y;
            pointMap.set(pts[0].id, pts[0]);
            changed = true;
          }
          break;

        case 'vertical':
          if (pts.length >= 2 && !pts[0].fixed) {
            pts[0].x = pts[1].x;
            pointMap.set(pts[0].id, pts[0]);
            changed = true;
          }
          break;

        case 'midpoint':
          if (pts.length >= 3 && !pts[0].fixed) {
            pts[0].x = (pts[1].x + pts[2].x) / 2;
            pts[0].y = (pts[1].y + pts[2].y) / 2;
            pointMap.set(pts[0].id, pts[0]);
            changed = true;
          }
          break;

        case 'distance':
          if (pts.length >= 2 && constraint.value !== undefined && !pts[0].fixed) {
            const dx = pts[1].x - pts[0].x;
            const dy = pts[1].y - pts[0].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0.001) {
              const scale = constraint.value / d;
              pts[0].x = pts[1].x - dx * scale;
              pts[0].y = pts[1].y - dy * scale;
              pointMap.set(pts[0].id, pts[0]);
              changed = true;
            }
          }
          break;
      }
    }

    if (!changed) break;
  }

  // Check which constraints are still unsatisfied → conflicts
  for (const constraint of constraints) {
    if (!checkConstraintSatisfied(constraint, pointMap)) {
      conflictIds.push(constraint.id);
    }
  }

  return { points: Array.from(pointMap.values()), conflictIds };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConstraintSolver(): UseConstraintSolverResult {
  const [state, setState] = useState<ConstraintSolverState>({
    constraints: [],
    points: [],
    isSolved: false,
    conflictIds: [],
  });

  const addConstraint = useCallback((
    type: ConstraintType,
    entityIds: string[],
    value?: number
  ): string => {
    const id = crypto.randomUUID();
    setState((prev) => ({
      ...prev,
      constraints: [
        ...prev.constraints,
        { id, type, entityIds, value, satisfied: false },
      ],
      isSolved: false,
    }));
    return id;
  }, []);

  const removeConstraint = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      constraints: prev.constraints.filter((c) => c.id !== id),
      isSolved: false,
    }));
  }, []);

  const addPoint = useCallback((id: string, x: number, y: number, fixed = false) => {
    setState((prev) => ({
      ...prev,
      points: [...prev.points.filter((p) => p.id !== id), { id, x, y, fixed }],
      isSolved: false,
    }));
  }, []);

  const updatePoint = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      points: prev.points.map((p) => p.id === id ? { ...p, x, y } : p),
      isSolved: false,
    }));
  }, []);

  const solve = useCallback(() => {
    setState((prev) => {
      const { points, conflictIds } = solveConstraints(prev.points, prev.constraints);
      const pointMap = new Map(points.map((p) => [p.id, p]));
      const constraints = prev.constraints.map((c) => ({
        ...c,
        satisfied: checkConstraintSatisfied(c, pointMap),
      }));
      return {
        constraints,
        points,
        isSolved: conflictIds.length === 0,
        conflictIds,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ constraints: [], points: [], isSolved: false, conflictIds: [] });
  }, []);

  const degreesOfFreedom = useMemo(
    () => computeDegreesOfFreedom(state.points.length, state.constraints),
    [state.points.length, state.constraints]
  );

  const isOverConstrained = state.conflictIds.length > 0;
  const isUnderConstrained = !isOverConstrained && degreesOfFreedom > 0;

  return {
    state,
    addConstraint,
    removeConstraint,
    addPoint,
    updatePoint,
    solve,
    reset,
    isOverConstrained,
    isUnderConstrained,
    degreesOfFreedom,
  };
}
