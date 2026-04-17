/**
 * SpatialGrid — a 2D grid-based spatial index for O(1) average-case
 * nearest-point queries.
 *
 * World space is partitioned into square cells of `cellSize` world units.
 * `query(x, y, radius)` only inspects the cells that overlap the query
 * circle, so the number of cells visited is O((radius/cellSize)^2) rather
 * than O(n) over all inserted points.
 */

export interface SpatialEntry {
  x: number;
  y: number;
  payload: unknown;
}

export class SpatialGrid {
  private readonly cellSize: number;
  private readonly cells: Map<string, SpatialEntry[]>;

  constructor(cellSize: number) {
    if (cellSize <= 0) throw new RangeError('cellSize must be positive');
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  /** Convert world coordinates to cell indices. */
  private cellKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private toCell(coord: number): number {
    return Math.floor(coord / this.cellSize);
  }

  /** Insert a point with an arbitrary payload into the index. */
  insert(x: number, y: number, payload: unknown): void {
    const key = this.cellKey(this.toCell(x), this.toCell(y));
    let bucket = this.cells.get(key);
    if (bucket === undefined) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push({ x, y, payload });
  }

  /**
   * Return all entries whose (x, y) position is within `radius` of (x, y).
   * Only cells that intersect the query circle are examined.
   */
  query(x: number, y: number, radius: number): SpatialEntry[] {
    const results: SpatialEntry[] = [];
    const r2 = radius * radius;

    const minCX = this.toCell(x - radius);
    const maxCX = this.toCell(x + radius);
    const minCY = this.toCell(y - radius);
    const maxCY = this.toCell(y + radius);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const bucket = this.cells.get(this.cellKey(cx, cy));
        if (bucket === undefined) continue;
        for (const entry of bucket) {
          const dx = entry.x - x;
          const dy = entry.y - y;
          if (dx * dx + dy * dy <= r2) {
            results.push(entry);
          }
        }
      }
    }

    return results;
  }

  /** Remove all entries from the index. */
  clear(): void {
    this.cells.clear();
  }

  /** Number of cells currently allocated (useful for debugging). */
  get cellCount(): number {
    return this.cells.size;
  }
}
