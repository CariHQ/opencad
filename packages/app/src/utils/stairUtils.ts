/**
 * T-BIM-009: Stair Tool — utility for generating stair tread line positions
 */

export interface StairTread {
  y: number;
}

/**
 * Generate internal horizontal tread line y-positions for a stair in plan view.
 *
 * The stair occupies the rectangle [x, y, x+width, y+depth].
 * The top edge (y) and bottom edge (y+depth) are the bounding box faces —
 * they are NOT included in the returned array.  Only the internal tread lines
 * between the first and last riser are returned, giving numRisers-1 lines.
 *
 * @param x        - Top-left x position of the stair bounding box (mm)
 * @param y        - Top-left y position of the stair bounding box (mm)
 * @param width    - Width of the stair (horizontal, mm) — does not affect tread y positions
 * @param depth    - Run depth of the stair (vertical in plan, mm)
 * @param numRisers - Number of risers (must be >= 2; depth must be > 0)
 * @returns Array of StairTread objects with y-positions of internal tread lines
 */
export function generateStairTreads(
  _x: number,
  y: number,
  _width: number,
  depth: number,
  numRisers: number,
): StairTread[] {
  if (numRisers < 2 || depth <= 0) {
    return [];
  }

  const spacing = depth / numRisers;
  const treads: StairTread[] = [];

  for (let i = 1; i < numRisers; i++) {
    treads.push({ y: y + spacing * i });
  }

  return treads;
}
