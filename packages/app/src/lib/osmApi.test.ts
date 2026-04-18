/**
 * OSM API tests
 * T-SITE-001: OSM site import
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  latLonToLocalXY,
  osmToDocumentElements,
  fetchOSMData,
  type OSMBuilding,
  type OSMSiteData,
} from './osmApi';
expect.extend(jestDomMatchers);

// ── latLonToLocalXY ────────────────────────────────────────────────────────

describe('T-SITE-001: latLonToLocalXY', () => {
  it('converts center to (0, 0)', () => {
    const result = latLonToLocalXY(51.5, -0.1, 51.5, -0.1);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('gives correct distance for 1° latitude offset (~111 km)', () => {
    // 1 degree of latitude ≈ 111 319 metres
    const result = latLonToLocalXY(52.5, -0.1, 51.5, -0.1);
    expect(result.y).toBeCloseTo(111319, -3); // within ~1 km
    expect(result.x).toBeCloseTo(0, 0);
  });

  it('gives correct distance for 1° longitude offset at equator (~111 km)', () => {
    // At the equator 1° lon ≈ 111 319 m; here we use lat=0
    const result = latLonToLocalXY(0, 1.0, 0, 0);
    expect(result.x).toBeCloseTo(111319, -3);
    expect(result.y).toBeCloseTo(0, 0);
  });

  it('returns negative x for western offset', () => {
    const result = latLonToLocalXY(51.5, -0.2, 51.5, -0.1);
    expect(result.x).toBeLessThan(0);
  });

  it('returns negative y for southern offset', () => {
    const result = latLonToLocalXY(51.4, -0.1, 51.5, -0.1);
    expect(result.y).toBeLessThan(0);
  });
});

// ── osmToDocumentElements ──────────────────────────────────────────────────

describe('T-SITE-001: osmToDocumentElements', () => {
  const makeBuilding = (overrides: Partial<OSMBuilding> = {}): OSMBuilding => ({
    id: 'way/123',
    buildingType: 'yes',
    footprint: [
      { lat: 51.501, lon: -0.101 },
      { lat: 51.502, lon: -0.101 },
      { lat: 51.502, lon: -0.099 },
      { lat: 51.501, lon: -0.099 },
    ],
    tags: { building: 'yes' },
    ...overrides,
  });

  const makeSiteData = (buildings: OSMBuilding[]): OSMSiteData => ({
    buildings,
    roads: [],
    centerLat: 51.5,
    centerLon: -0.1,
    radiusMeters: 200,
  });

  it('returns an array of ElementSchema', () => {
    const elements = osmToDocumentElements(makeSiteData([makeBuilding()]), 'layer-1');
    expect(Array.isArray(elements)).toBe(true);
  });

  it('creates wall elements for each edge of a building footprint', () => {
    // 4-vertex footprint → 4 wall segments
    const elements = osmToDocumentElements(makeSiteData([makeBuilding()]), 'layer-1');
    const walls = elements.filter((e) => e.type === 'wall');
    expect(walls.length).toBe(4);
  });

  it('all elements have the supplied layerId', () => {
    const elements = osmToDocumentElements(makeSiteData([makeBuilding()]), 'my-layer');
    elements.forEach((el) => expect(el.layerId).toBe('my-layer'));
  });

  it('elements have unique ids', () => {
    const elements = osmToDocumentElements(makeSiteData([makeBuilding()]), 'layer-1');
    const ids = elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles multiple buildings', () => {
    const data = makeSiteData([makeBuilding(), makeBuilding({ id: 'way/456' })]);
    const elements = osmToDocumentElements(data, 'layer-1');
    // 2 buildings × 4 walls each
    expect(elements.filter((e) => e.type === 'wall').length).toBe(8);
  });

  it('handles empty buildings array', () => {
    const elements = osmToDocumentElements(makeSiteData([]), 'layer-1');
    expect(elements).toHaveLength(0);
  });

  it('wall properties contain start/end coordinates', () => {
    const elements = osmToDocumentElements(makeSiteData([makeBuilding()]), 'layer-1');
    const wall = elements.find((e) => e.type === 'wall');
    expect(wall).toBeDefined();
    expect(wall!.properties).toHaveProperty('startX');
    expect(wall!.properties).toHaveProperty('startY');
    expect(wall!.properties).toHaveProperty('endX');
    expect(wall!.properties).toHaveProperty('endY');
  });

  it('coordinates are stored in mm (×1000 from meters)', () => {
    // Build a simple 2-point footprint so edge goes from center to ~10m north
    const building: OSMBuilding = {
      id: 'way/999',
      buildingType: 'yes',
      footprint: [
        { lat: 51.5, lon: -0.1 },         // center → (0, 0)
        { lat: 51.5000899, lon: -0.1 },    // ~10 m north
      ],
      tags: {},
    };
    const siteData: OSMSiteData = {
      buildings: [building],
      roads: [],
      centerLat: 51.5,
      centerLon: -0.1,
      radiusMeters: 200,
    };
    const elements = osmToDocumentElements(siteData, 'l');
    const wall = elements.find((e) => e.type === 'wall');
    expect(wall).toBeDefined();
    // startX at center = 0 mm
    const startX = (wall!.properties.startX as { value: number }).value;
    expect(startX).toBeCloseTo(0, 0);
    // endY ~ 10_000 mm (10 metres × 1000)
    const endY = (wall!.properties.endY as { value: number }).value;
    expect(endY).toBeGreaterThan(5000);
    expect(endY).toBeLessThan(15000);
  });
});

// ── fetchOSMData ───────────────────────────────────────────────────────────

describe('T-SITE-001: fetchOSMData', () => {
  beforeEach(() => { vi.resetAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  const makeOverpassResponse = (elements: unknown[] = []) => ({
    elements,
  });

  it('calls fetch with the Overpass API URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeOverpassResponse(),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchOSMData(51.5, -0.1, 200);

    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/overpass-api\.de/);
  });

  it('includes lat, lon and radius in the query', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeOverpassResponse(),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchOSMData(51.5, -0.1, 300);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit | undefined];
    const body = typeof init?.body === 'string' ? init.body : url;
    expect(body).toMatch(/51\.5/);
    expect(body).toMatch(/-0\.1/);
    expect(body).toMatch(/300/);
  });

  it('returns OSMSiteData with correct center and radius', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeOverpassResponse(),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchOSMData(51.5, -0.1, 200);
    expect(result.centerLat).toBe(51.5);
    expect(result.centerLon).toBe(-0.1);
    expect(result.radiusMeters).toBe(200);
  });

  it('parses building ways from the response', async () => {
    const overpassBuilding = {
      type: 'way',
      id: 123,
      tags: { building: 'yes', name: 'Test Building', 'building:levels': '3' },
      geometry: [
        { lat: 51.501, lon: -0.101 },
        { lat: 51.502, lon: -0.101 },
        { lat: 51.502, lon: -0.099 },
        { lat: 51.501, lon: -0.099 },
      ],
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeOverpassResponse([overpassBuilding]),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchOSMData(51.5, -0.1, 200);
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].id).toBe('way/123');
    expect(result.buildings[0].buildingType).toBe('yes');
    expect(result.buildings[0].name).toBe('Test Building');
    expect(result.buildings[0].levels).toBe(3);
  });

  it('parses road ways from the response', async () => {
    const overpassRoad = {
      type: 'way',
      id: 456,
      tags: { highway: 'residential', name: 'High Street' },
      geometry: [
        { lat: 51.501, lon: -0.101 },
        { lat: 51.502, lon: -0.102 },
      ],
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeOverpassResponse([overpassRoad]),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchOSMData(51.5, -0.1, 200);
    expect(result.roads).toHaveLength(1);
    expect(result.roads[0].id).toBe('way/456');
    expect(result.roads[0].name).toBe('High Street');
    expect(result.roads[0].type).toBe('residential');
  });

  it('throws on non-ok HTTP response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchOSMData(51.5, -0.1, 200)).rejects.toThrow();
  });
});
