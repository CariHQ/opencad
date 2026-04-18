/**
 * Solar Analysis
 * T-AI-030: Simplified solar position and daylight hour estimation
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SolarPosition {
  azimuth: number;   // degrees, 0–360
  elevation: number; // degrees, 0–90 (clamped; never negative)
  hour: number;
  month: number;
}

export interface SolarConfig {
  latitude: number;  // degrees, positive = north
  longitude: number; // degrees, positive = east (unused in simplified formula)
  month: number;     // 1–12
  hour: number;      // 0–23
}

// ─── Solar Position ───────────────────────────────────────────────────────────

/**
 * Calculate a simplified solar position for the given config.
 *
 * Formulas (per spec):
 *   elevation = 90 - |latitude| + 23.5 * cos((month - 6) / 6 * π)
 *   azimuth   = ((hour - 12) / 12) * 180 + 180
 *
 * Elevation is clamped to [0, 90].
 */
export function calculateSolarPosition(config: SolarConfig): SolarPosition {
  const rawElevation =
    90 -
    Math.abs(config.latitude) +
    23.5 * Math.cos(((config.month - 6) / 6) * Math.PI);

  const elevation = Math.min(90, Math.max(0, rawElevation));
  const azimuth = ((config.hour - 12) / 12) * 180 + 180;

  return {
    elevation,
    azimuth,
    hour: config.hour,
    month: config.month,
  };
}

// ─── Daylight Hours ───────────────────────────────────────────────────────────

/**
 * Estimate daylight hours for a given latitude and month.
 *
 * Formulas (per spec):
 *   Summer (month 6): 12 + 2 * (latitude / 90) * 4
 *   Winter (month 12): 12 - 2 * (latitude / 90) * 4
 *   Other months: interpolated using cosine
 *
 * Result is clamped to [6, 18].
 */
export function estimateDaylightHours(latitude: number, month: number): number {
  // Seasonal factor: +1 at summer solstice, -1 at winter solstice
  const seasonFactor = Math.cos(((month - 6) / 6) * Math.PI);
  const raw = 12 + 2 * (latitude / 90) * 4 * seasonFactor;
  return Math.min(18, Math.max(6, raw));
}
