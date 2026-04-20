/**
 * PDF-as-trace underlay — T-IO-051 (#344).
 *
 * An underlay is a rendered PDF page placed behind the drawing for
 * tracing. This module covers the data model + scale-calibration math.
 * The actual raster rendering uses pdf.js in the UI layer.
 */

export interface PDFUnderlay {
  id: string;
  /** Source PDF file name or URL. */
  source: string;
  /** Page index (0-based). */
  pageIndex: number;
  /** Opacity (0..1). */
  opacity: number;
  /** Scale factor (PDF point → world mm). 1.0 = no scaling. */
  scale: number;
  /** Rotation in degrees, CW. */
  rotation: number;
  /** World-coord offset of the page's top-left corner. */
  origin: { x: number; y: number };
  /** If true, ignores pointer events so tracing passes through. */
  locked: boolean;
}

/** Build a new underlay record with sensible defaults. */
export function createUnderlay(source: string, pageIndex = 0): PDFUnderlay {
  return {
    id: `pdfu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    source, pageIndex,
    opacity: 0.5,
    scale: 1,
    rotation: 0,
    origin: { x: 0, y: 0 },
    locked: true,
  };
}

/**
 * Calibrate scale: user picks two points on the underlay (in page-pixel
 * space) and enters the real-world distance. Return the new `scale`
 * multiplier to set on the underlay.
 *
 *   pixelDistance = sqrt((p2.x - p1.x)² + (p2.y - p1.y)²)
 *   scale         = realWorldMm / pixelDistance
 */
export function calibrateScale(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  realWorldMm: number,
): number {
  const pxDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (pxDist < 1e-6) return 1;
  return realWorldMm / pxDist;
}

/** Apply the underlay transform to a point on the page, returning its
 *  position in world mm. */
export function pageToWorld(
  underlay: PDFUnderlay,
  pagePoint: { x: number; y: number },
): { x: number; y: number } {
  const rad = (underlay.rotation * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  const sx = pagePoint.x * underlay.scale;
  const sy = pagePoint.y * underlay.scale;
  return {
    x: underlay.origin.x + sx * c - sy * s,
    y: underlay.origin.y + sx * s + sy * c,
  };
}
