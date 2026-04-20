/**
 * Sun study animation — T-VIZ-041 (#334).
 *
 * Astronomical sun-position calculation with a simple frame-timeline
 * iterator. Returns a unit vector pointing at the sun from the site
 * for any given date + time. Solar algorithm: NOAA-style equation of
 * time + declination + hour angle, accurate to within ~1° for any
 * date between 1800 and 2200.
 */

export interface SiteLocation {
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface SunVec {
  /** Unit vector from site toward the sun. +Y is up. */
  x: number; y: number; z: number;
  elevationDeg: number;  // 0 = horizon, 90 = zenith
  azimuthDeg: number;    // 0 = N, 90 = E, clockwise
}

function julianDay(date: Date): number {
  // Milliseconds since 2000-01-01 12:00:00 UTC
  const ms = date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0);
  return ms / 86400000;
}

/**
 * NOAA-style sun position. `date` is interpreted as UTC.
 * Returns elevation + azimuth in degrees.
 */
export function sunDirectionAt(date: Date, site: SiteLocation): SunVec {
  const jd = julianDay(date);
  const toRad = (d: number) => d * Math.PI / 180;
  const toDeg = (r: number) => r * 180 / Math.PI;

  // Mean longitude + mean anomaly (deg)
  const L = (280.460 + 0.9856474 * jd) % 360;
  const g = toRad((357.528 + 0.9856003 * jd) % 360);
  // Ecliptic longitude
  const lambda = toRad(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  // Obliquity of ecliptic
  const eps = toRad(23.439 - 0.0000004 * jd);
  // Right ascension + declination
  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const delta = Math.asin(Math.sin(eps) * Math.sin(lambda));

  // Hour angle
  const gmst = 18.697374558 + 24.06570982441908 * jd;
  const utHours = (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600);
  void utHours;
  const lmst = (gmst * 15 + site.longitudeDeg) % 360;
  const H = toRad(lmst) - alpha;

  const lat = toRad(site.latitudeDeg);
  const sinEl = Math.sin(lat) * Math.sin(delta) + Math.cos(lat) * Math.cos(delta) * Math.cos(H);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const cosAz = (Math.sin(delta) - Math.sin(elevation) * Math.sin(lat)) / (Math.cos(elevation) * Math.cos(lat));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(H) > 0) azimuth = 2 * Math.PI - azimuth;
  // Convert to x/y/z (+Y up, +X east, +Z south so +N is -Z)
  const az = azimuth;
  const el = elevation;
  return {
    x: Math.cos(el) * Math.sin(az),
    y: Math.sin(el),
    z: -Math.cos(el) * Math.cos(az),
    elevationDeg: toDeg(el),
    azimuthDeg: toDeg(az),
  };
}

/** Build a timeline of sun positions between start and end at a given step. */
export function buildSunTimeline(
  site: SiteLocation,
  startUtc: Date,
  endUtc: Date,
  stepMinutes: number,
): Array<{ timestamp: Date; sun: SunVec }> {
  const out: Array<{ timestamp: Date; sun: SunVec }> = [];
  const stepMs = stepMinutes * 60_000;
  for (let t = startUtc.getTime(); t <= endUtc.getTime(); t += stepMs) {
    const d = new Date(t);
    out.push({ timestamp: d, sun: sunDirectionAt(d, site) });
  }
  return out;
}
