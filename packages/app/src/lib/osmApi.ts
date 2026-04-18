/**
 * OpenStreetMap / Overpass API client for site import.
 *
 * Provides:
 *  - latLonToLocalXY  — project lat/lon onto a flat local plane (metres)
 *  - fetchOSMData     — query Overpass for buildings + roads around a point
 *  - osmToDocumentElements — convert OSM data to OpenCAD ElementSchema walls
 */
import type { ElementSchema } from '@opencad/document';

// ── Public types ───────────────────────────────────────────────────────────

export interface OSMBuilding {
  id: string;
  name?: string;
  buildingType: string; // 'yes', 'residential', 'commercial', 'office', etc.
  levels?: number;
  height?: number; // metres
  footprint: Array<{ lat: number; lon: number }>; // polygon vertices
  tags: Record<string, string>;
}

export interface OSMSiteData {
  buildings: OSMBuilding[];
  roads: Array<{
    id: string;
    name?: string;
    type: string;
    nodes: Array<{ lat: number; lon: number }>;
  }>;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
}

// ── Coordinate conversion ──────────────────────────────────────────────────

/** Mean radius of the Earth in metres. */
const EARTH_RADIUS_M = 6_371_000;

/**
 * Convert a lat/lon point to local XY coordinates (metres) relative to the
 * given centre point.  Uses an equirectangular approximation which is
 * accurate enough for small areas (< 10 km radius).
 *
 * @param lat       - Latitude of the point to convert (degrees)
 * @param lon       - Longitude of the point to convert (degrees)
 * @param centerLat - Latitude of the local origin (degrees)
 * @param centerLon - Longitude of the local origin (degrees)
 * @returns { x, y } in metres; east is positive x, north is positive y
 */
export function latLonToLocalXY(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
): { x: number; y: number } {
  const latRad = (centerLat * Math.PI) / 180;
  const dLat = ((lat - centerLat) * Math.PI) / 180;
  const dLon = ((lon - centerLon) * Math.PI) / 180;

  const y = dLat * EARTH_RADIUS_M;
  const x = dLon * Math.cos(latRad) * EARTH_RADIUS_M;

  return { x, y };
}

// ── Overpass API ───────────────────────────────────────────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
  type: 'way' | 'node' | 'relation';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Fetch buildings and roads from the Overpass API around the given point.
 *
 * All HTTP I/O goes through the global `fetch`, making it trivial to stub in
 * tests with `vi.stubGlobal('fetch', mockFn)`.
 *
 * @param lat          - Centre latitude (degrees)
 * @param lon          - Centre longitude (degrees)
 * @param radiusMeters - Search radius in metres
 */
export async function fetchOSMData(
  lat: number,
  lon: number,
  radiusMeters: number,
): Promise<OSMSiteData> {
  const query = `[out:json][timeout:10];
(
  way[building](around:${radiusMeters},${lat},${lon});
  way[highway](around:${radiusMeters},${lat},${lon});
);
out geom;`;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(
      `Overpass API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OverpassResponse;

  const buildings: OSMBuilding[] = [];
  const roads: OSMSiteData['roads'] = [];

  for (const el of data.elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    const tags = el.tags ?? {};

    if (tags['building'] !== undefined) {
      const levelsRaw = tags['building:levels'];
      const heightRaw = tags['height'];
      buildings.push({
        id: `way/${el.id}`,
        name: tags['name'],
        buildingType: tags['building'],
        levels: levelsRaw !== undefined ? parseInt(levelsRaw, 10) : undefined,
        height: heightRaw !== undefined ? parseFloat(heightRaw) : undefined,
        footprint: el.geometry,
        tags,
      });
    } else if (tags['highway'] !== undefined) {
      roads.push({
        id: `way/${el.id}`,
        name: tags['name'],
        type: tags['highway'],
        nodes: el.geometry,
      });
    }
  }

  return { buildings, roads, centerLat: lat, centerLon: lon, radiusMeters };
}

// ── Document element conversion ────────────────────────────────────────────

/**
 * Convert OSM buildings to a flat list of wall ElementSchema objects, one wall
 * per footprint edge.  Coordinates are converted from metres to millimetres
 * (× 1 000) to match OpenCAD's internal unit convention.
 *
 * @param siteData - Parsed OSM site data
 * @param layerId  - Target layer ID for all generated elements
 */
export function osmToDocumentElements(
  siteData: OSMSiteData,
  layerId: string,
): ElementSchema[] {
  const elements: ElementSchema[] = [];

  for (const building of siteData.buildings) {
    const pts = building.footprint;
    if (pts.length < 2) continue;

    // Determine whether the footprint is already closed (first == last).
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const isClosed =
      firstPt.lat === lastPt.lat && firstPt.lon === lastPt.lon;

    // Iterate over edges.  For an open polygon we add a closing edge; for a
    // closed polygon the last point IS the first point so skip the final duped vertex.
    const edgeCount = isClosed ? pts.length - 1 : pts.length;

    for (let i = 0; i < edgeCount; i++) {
      const fromPt = pts[i];
      const toPt = pts[(i + 1) % pts.length]; // wraps around to close polygon

      const from = latLonToLocalXY(
        fromPt.lat,
        fromPt.lon,
        siteData.centerLat,
        siteData.centerLon,
      );
      const to = latLonToLocalXY(
        toPt.lat,
        toPt.lon,
        siteData.centerLat,
        siteData.centerLon,
      );

      // Convert metres → millimetres
      const startX = from.x * 1000;
      const startY = from.y * 1000;
      const endX = to.x * 1000;
      const endY = to.y * 1000;

      const wallId = `osm-${building.id}-wall-${i}`;
      const now = Date.now();

      const wall: ElementSchema = {
        id: wallId,
        type: 'wall',
        layerId,
        levelId: null,
        visible: true,
        locked: false,
        properties: {
          startX: { type: 'number', value: startX, unit: 'mm' },
          startY: { type: 'number', value: startY, unit: 'mm' },
          endX: { type: 'number', value: endX, unit: 'mm' },
          endY: { type: 'number', value: endY, unit: 'mm' },
          height: {
            type: 'number',
            value: building.height !== undefined ? building.height * 1000 : 3000,
            unit: 'mm',
          },
          thickness: { type: 'number', value: 300, unit: 'mm' },
          osmBuildingId: { type: 'string', value: building.id },
          buildingType: { type: 'string', value: building.buildingType },
        },
        propertySets: [],
        geometry: {
          type: 'curve',
          data: { start: { x: startX, y: startY }, end: { x: endX, y: endY } },
        },
        transform: {
          translation: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        boundingBox: {
          min: {
            _type: 'Point3D',
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            z: 0,
          },
          max: {
            _type: 'Point3D',
            x: Math.max(startX, endX),
            y: Math.max(startY, endY),
            z: building.height !== undefined ? building.height * 1000 : 3000,
          },
        },
        metadata: {
          id: wallId,
          createdBy: 'osm-import',
          createdAt: now,
          updatedAt: now,
          version: { clock: {} },
        },
      };

      elements.push(wall);
    }
  }

  return elements;
}
