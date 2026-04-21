/**
 * Rule-based stair geometry — T-MOD-010 (#303).
 *
 * Given story height + tread depth + width, compute tread count +
 * riser height + run length per building-code defaults. Straight +
 * L-shape flights supported.
 */

export type StairType = 'straight' | 'L-shape';

export interface StairParams {
  type: StairType;
  storyHeight: number;   // mm
  treadDepth: number;    // mm (going)
  width: number;         // mm
  handedness?: 'L' | 'R';
  /** Max riser per building code (IBC 196 mm). */
  maxRiser?: number;
}

export interface StairResult {
  riserCount: number;
  riserHeight: number;
  runLength: number;
  flights: Array<{ origin: { x: number; y: number; z: number }; direction: 'x' | 'y'; treadCount: number }>;
  landings: Array<{ origin: { x: number; y: number; z: number }; width: number; depth: number }>;
}

/** Compute stair geometry from parameters. */
export function computeStairGeometry(params: StairParams): StairResult {
  const maxRiser = params.maxRiser ?? 196;
  // Smallest riserCount such that riserHeight ≤ maxRiser
  const riserCount = Math.max(2, Math.ceil(params.storyHeight / maxRiser));
  const riserHeight = params.storyHeight / riserCount;
  const treadCount = riserCount - 1;  // top riser lands on the next level
  const runLength = treadCount * params.treadDepth;

  const flights: StairResult['flights'] = [];
  const landings: StairResult['landings'] = [];

  if (params.type === 'straight') {
    flights.push({ origin: { x: 0, y: 0, z: 0 }, direction: 'y', treadCount });
  } else {
    // L-shape: half flight, landing, half flight
    const halfTreads = Math.floor(treadCount / 2);
    flights.push({ origin: { x: 0, y: 0, z: 0 }, direction: 'y', treadCount: halfTreads });
    const landY = halfTreads * params.treadDepth;
    landings.push({
      origin: { x: 0, y: landY, z: halfTreads * riserHeight },
      width: params.width, depth: params.width,
    });
    const turnX = params.handedness === 'L' ? -params.width : params.width;
    flights.push({
      origin: { x: turnX, y: landY, z: halfTreads * riserHeight },
      direction: 'x',
      treadCount: treadCount - halfTreads,
    });
  }

  return { riserCount, riserHeight, runLength, flights, landings };
}

/** Check if a computed stair is code-compliant. */
export function isStairCompliant(r: StairResult, maxRiser = 196, _minTread = 280): boolean {
  return r.riserHeight <= maxRiser && r.runLength > 0 && r.riserCount >= 2;
}
