/**
 * Point cloud import — T-IO-050.
 *
 * Parses ASCII PLY and XYZ / TXT point lists into a flat Float32Array that
 * can be fed directly to THREE.BufferGeometry for rendering as THREE.Points.
 * Large clouds are decimated during parse so the viewport stays interactive
 * without requiring a separate LOD pipeline.
 */

export interface PointCloudData {
  /** Flat XYZ buffer: [x0, y0, z0, x1, y1, z1, ...]. Length % 3 === 0. */
  positions: Float32Array;
  /** Optional per-point RGB colour buffer, same ordering (values in 0–1). */
  colors?: Float32Array;
  /** Axis-aligned bounding box in the cloud's coordinate space. */
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  /** Original point count before any decimation. */
  pointCount: number;
  /** Count actually retained (<= pointCount when decimation kicked in). */
  renderedCount: number;
}

export interface ParseOptions {
  /** Hard cap on retained points. When the input has more, a stride-based
   *  decimation (keep every Nth point) reduces to at most this many. */
  maxPoints?: number;
  /** Scale applied to every coordinate — e.g. 1000 if the file is in metres
   *  but the document works in millimetres. Default: 1 (no scaling). */
  scale?: number;
}

const DEFAULT_MAX_POINTS = 500_000;

// ─── Shared bounds accumulator ───────────────────────────────────────────────

function emptyBounds() {
  return {
    min: { x:  Infinity, y:  Infinity, z:  Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
}
function expandBounds(b: ReturnType<typeof emptyBounds>, x: number, y: number, z: number): void {
  if (x < b.min.x) b.min.x = x;
  if (y < b.min.y) b.min.y = y;
  if (z < b.min.z) b.min.z = z;
  if (x > b.max.x) b.max.x = x;
  if (y > b.max.y) b.max.y = y;
  if (z > b.max.z) b.max.z = z;
}

// ─── XYZ / TXT (whitespace-separated) ────────────────────────────────────────

/**
 * Parse a point cloud in XYZ / TXT format: one point per line, whitespace-
 * separated. Supports:
 *   x y z
 *   x y z r g b          (RGB 0–255)
 *   x y z r g b i        (RGB + intensity — intensity is discarded)
 * Lines starting with '#' or empty lines are ignored.
 */
export function parseXYZ(source: string, options: ParseOptions = {}): PointCloudData {
  const scale = options.scale ?? 1;
  const maxPoints = options.maxPoints ?? DEFAULT_MAX_POINTS;

  // First pass: count points so we can pick a stride up front instead of
  // re-allocating during the parse.
  let totalLines = 0;
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10 /* \n */) totalLines++;
  }
  const stride = totalLines > maxPoints ? Math.ceil(totalLines / maxPoints) : 1;
  const estimated = Math.min(maxPoints, Math.ceil(totalLines / stride));

  const positions = new Float32Array(estimated * 3);
  const colors: Float32Array | null = new Float32Array(estimated * 3);
  const bounds = emptyBounds();

  let written = 0;
  let lineIndex = 0;
  let lineStart = 0;
  let hasColors = false;

  for (let i = 0; i <= source.length; i++) {
    const isEnd = i === source.length;
    const isEOL = !isEnd && source.charCodeAt(i) === 10;
    if (!isEOL && !isEnd) continue;

    const rawLine = source.slice(lineStart, i).trim();
    lineStart = i + 1;

    if (rawLine.length === 0 || rawLine.charCodeAt(0) === 35 /* # */) {
      lineIndex++;
      continue;
    }
    if (lineIndex % stride !== 0) {
      lineIndex++;
      continue;
    }
    lineIndex++;

    const parts = rawLine.split(/\s+/);
    if (parts.length < 3) continue;

    const x = parseFloat(parts[0]!) * scale;
    const y = parseFloat(parts[1]!) * scale;
    const z = parseFloat(parts[2]!) * scale;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

    if (written >= estimated) break;
    positions[written * 3]     = x;
    positions[written * 3 + 1] = y;
    positions[written * 3 + 2] = z;
    expandBounds(bounds, x, y, z);

    if (parts.length >= 6) {
      const r = parseFloat(parts[3]!);
      const g = parseFloat(parts[4]!);
      const b = parseFloat(parts[5]!);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        colors![written * 3]     = r > 1 ? r / 255 : r;
        colors![written * 3 + 1] = g > 1 ? g / 255 : g;
        colors![written * 3 + 2] = b > 1 ? b / 255 : b;
        hasColors = true;
      }
    }

    written++;
  }

  if (bounds.min.x === Infinity) {
    // No valid points — collapse bounds to zero.
    bounds.min = { x: 0, y: 0, z: 0 };
    bounds.max = { x: 0, y: 0, z: 0 };
  }

  return {
    positions: written === estimated ? positions : positions.slice(0, written * 3),
    colors: hasColors ? (written === estimated ? colors! : colors!.slice(0, written * 3)) : undefined,
    bounds,
    pointCount: totalLines,
    renderedCount: written,
  };
}

// ─── PLY (ASCII only; binary would need DataView handling) ───────────────────

interface PlyHeader {
  elementCount: number;
  properties: string[];
  byteOffset: number; // index in source where body starts
  format: 'ascii' | 'binary_little_endian' | 'binary_big_endian';
}

function parsePlyHeader(source: string): PlyHeader | null {
  if (!source.startsWith('ply')) return null;
  const lines = source.split('\n');
  let elementCount = 0;
  const properties: string[] = [];
  let format: PlyHeader['format'] = 'ascii';
  let cursor = 0;
  let inVertexElement = false;

  for (const line of lines) {
    cursor += line.length + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('format ')) {
      const fmt = trimmed.split(/\s+/)[1];
      if (fmt === 'ascii') format = 'ascii';
      else if (fmt === 'binary_little_endian') format = 'binary_little_endian';
      else if (fmt === 'binary_big_endian') format = 'binary_big_endian';
    } else if (trimmed.startsWith('element vertex ')) {
      inVertexElement = true;
      elementCount = parseInt(trimmed.split(/\s+/)[2]!, 10) || 0;
    } else if (trimmed.startsWith('element ')) {
      inVertexElement = false;
    } else if (inVertexElement && trimmed.startsWith('property ')) {
      const parts = trimmed.split(/\s+/);
      properties.push(parts[parts.length - 1]!);
    } else if (trimmed === 'end_header') {
      return { elementCount, properties, byteOffset: cursor, format };
    }
  }
  return null;
}

/**
 * Parse an ASCII PLY file. Binary PLY returns an empty cloud — use a
 * dedicated loader (e.g. three/examples/jsm/loaders/PLYLoader) for those.
 */
export function parsePLY(source: string, options: ParseOptions = {}): PointCloudData {
  const header = parsePlyHeader(source);
  if (!header || header.format !== 'ascii') {
    return {
      positions: new Float32Array(0),
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      pointCount: 0, renderedCount: 0,
    };
  }

  const scale = options.scale ?? 1;
  const maxPoints = options.maxPoints ?? DEFAULT_MAX_POINTS;
  const stride = header.elementCount > maxPoints ? Math.ceil(header.elementCount / maxPoints) : 1;
  const estimated = Math.min(maxPoints, Math.ceil(header.elementCount / stride));

  const xIdx = header.properties.indexOf('x');
  const yIdx = header.properties.indexOf('y');
  const zIdx = header.properties.indexOf('z');
  const rIdx = header.properties.indexOf('red');
  const gIdx = header.properties.indexOf('green');
  const bIdx = header.properties.indexOf('blue');
  const hasColors = rIdx >= 0 && gIdx >= 0 && bIdx >= 0;

  const positions = new Float32Array(estimated * 3);
  const colors = hasColors ? new Float32Array(estimated * 3) : undefined;
  const bounds = emptyBounds();

  const body = source.slice(header.byteOffset);
  let written = 0;
  let lineIndex = 0;
  let lineStart = 0;

  for (let i = 0; i <= body.length && written < estimated; i++) {
    const isEnd = i === body.length;
    const isEOL = !isEnd && body.charCodeAt(i) === 10;
    if (!isEOL && !isEnd) continue;

    const line = body.slice(lineStart, i).trim();
    lineStart = i + 1;
    if (line.length === 0) { lineIndex++; continue; }
    if (lineIndex % stride !== 0) { lineIndex++; continue; }
    lineIndex++;

    const parts = line.split(/\s+/);
    const x = parseFloat(parts[xIdx]!) * scale;
    const y = parseFloat(parts[yIdx]!) * scale;
    const z = parseFloat(parts[zIdx]!) * scale;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

    positions[written * 3]     = x;
    positions[written * 3 + 1] = y;
    positions[written * 3 + 2] = z;
    expandBounds(bounds, x, y, z);

    if (hasColors) {
      const r = parseFloat(parts[rIdx]!);
      const g = parseFloat(parts[gIdx]!);
      const b = parseFloat(parts[bIdx]!);
      colors![written * 3]     = r > 1 ? r / 255 : r;
      colors![written * 3 + 1] = g > 1 ? g / 255 : g;
      colors![written * 3 + 2] = b > 1 ? b / 255 : b;
    }
    written++;
  }

  if (bounds.min.x === Infinity) {
    bounds.min = { x: 0, y: 0, z: 0 };
    bounds.max = { x: 0, y: 0, z: 0 };
  }

  return {
    positions: written === estimated ? positions : positions.slice(0, written * 3),
    colors: hasColors ? (written === estimated ? colors : colors!.slice(0, written * 3)) : undefined,
    bounds,
    pointCount: header.elementCount,
    renderedCount: written,
  };
}

// ─── Format detection ────────────────────────────────────────────────────────

export type PointCloudFormat = 'ply' | 'xyz';

export function detectFormat(filename: string, content: string): PointCloudFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.ply') || content.startsWith('ply')) return 'ply';
  return 'xyz';
}

export function parsePointCloud(
  filename: string,
  content: string,
  options: ParseOptions = {},
): PointCloudData {
  const fmt = detectFormat(filename, content);
  return fmt === 'ply' ? parsePLY(content, options) : parseXYZ(content, options);
}
