/**
 * AI Project Generation
 * T-AI-001: Prompt-to-project pipeline
 *
 * Calls the Anthropic API with a structured system prompt and parses the
 * response as a Partial<DocumentSchema>.  Falls back to a hardcoded
 * 2-bedroom house template when no API key is provided or the call fails.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Mirror of DocumentSchema property value (avoid cross-package import in tests). */
interface PV {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'reference';
  value: string | number | boolean | string[];
  unit?: string;
}

interface WallElement {
  id: string;
  type: 'wall';
  properties: Record<string, PV>;
  propertySets: unknown[];
  geometry: { type: string; data: unknown };
  layerId: string;
  levelId: string;
  transform: {
    translation: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  boundingBox: {
    min: { _type: 'Point3D'; x: number; y: number; z: number };
    max: { _type: 'Point3D'; x: number; y: number; z: number };
  };
  metadata: {
    id: string;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
    version: { clock: Record<string, number> };
  };
  visible: boolean;
  locked: boolean;
}

export interface GenerateProjectOptions {
  prompt: string;
  apiKey?: string; // Anthropic API key (optional — falls back to template)
}

export interface GenerateProjectResult {
  document: {
    id?: string;
    name?: string;
    version?: { clock: Record<string, number> };
    metadata?: {
      createdAt: number;
      updatedAt: number;
      createdBy: string;
      schemaVersion: string;
    };
    content?: {
      elements: Record<string, WallElement>;
      spaces: Record<string, unknown>;
    };
    organization?: {
      layers: Record<string, unknown>;
      levels: Record<string, unknown>;
    };
    presentation?: { views: Record<string, unknown>; annotations: Record<string, unknown> };
    library?: { materials: Record<string, unknown> };
  };
  description: string;
  warnings: string[];
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const GENERATE_SYSTEM_PROMPT = `You are an expert architect AI integrated into the OpenCAD BIM platform.
Your task is to generate a complete DocumentSchema JSON object for the given user prompt.

Return ONLY a single valid JSON object with this exact structure — no prose, no markdown fences:
{
  "id": "gen-<uuid>",
  "name": "<project name>",
  "version": { "clock": {} },
  "metadata": {
    "createdAt": <unix ms>,
    "updatedAt": <unix ms>,
    "createdBy": "ai",
    "schemaVersion": "1.0.0"
  },
  "content": {
    "elements": {
      "<element-id>": {
        "id": "<element-id>",
        "type": "wall",
        "properties": {
          "StartX": { "type": "number", "value": <mm> },
          "StartY": { "type": "number", "value": <mm> },
          "EndX":   { "type": "number", "value": <mm> },
          "EndY":   { "type": "number", "value": <mm> },
          "Height": { "type": "number", "value": 3000 },
          "Width":  { "type": "number", "value": 200 }
        },
        "propertySets": [],
        "geometry": { "type": "curve", "data": null },
        "layerId": "layer-walls",
        "levelId": "level-ground",
        "transform": {
          "translation": { "x": 0, "y": 0, "z": 0 },
          "rotation":    { "x": 0, "y": 0, "z": 0 },
          "scale":       { "x": 1, "y": 1, "z": 1 }
        },
        "boundingBox": {
          "min": { "_type": "Point3D", "x": 0, "y": 0, "z": 0 },
          "max": { "_type": "Point3D", "x": 0, "y": 0, "z": 3000 }
        },
        "metadata": {
          "id": "<element-id>",
          "createdBy": "ai",
          "createdAt": <unix ms>,
          "updatedAt": <unix ms>,
          "version": { "clock": {} }
        },
        "visible": true,
        "locked": false
      }
    },
    "spaces": {}
  },
  "organization": {
    "layers": {
      "layer-walls": { "id": "layer-walls", "name": "Walls", "color": "#4a90d9", "visible": true, "locked": false, "order": 0 },
      "layer-doors": { "id": "layer-doors", "name": "Doors", "color": "#e67e22", "visible": true, "locked": false, "order": 1 }
    },
    "levels": {
      "level-ground": { "id": "level-ground", "name": "Ground Floor", "elevation": 0, "height": 3000, "order": 0 },
      "level-first":  { "id": "level-first",  "name": "First Floor",  "elevation": 3000, "height": 3000, "order": 1 }
    }
  },
  "presentation": { "views": {}, "annotations": {} },
  "library": { "materials": {} }
}

Rules:
- All dimensions in millimetres (mm).  Default wall height: 3000 mm.
- Generate 3–10 wall elements forming the perimeter and interior walls of the layout.
- Add door elements (type "door") where appropriate.
- IBC compliance: bedrooms ≥ 120 sqft, egress doors ≥ 813 mm wide.
- Return ONLY the JSON — absolutely no other text.`;

// ─── Fallback Template ────────────────────────────────────────────────────────

function buildFallbackTemplate(prompt: string): GenerateProjectResult['document'] {
  const now = Date.now();
  // A simple 2-bedroom house: rectangular plan 12 m × 9 m
  // Walls in mm: perimeter + two interior partitions
  const walls: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> = [
    // Perimeter
    { id: 'wall-s',  x1: 0,     y1: 0,     x2: 12000, y2: 0 },
    { id: 'wall-e',  x1: 12000, y1: 0,     x2: 12000, y2: 9000 },
    { id: 'wall-n',  x1: 0,     y1: 9000,  x2: 12000, y2: 9000 },
    { id: 'wall-w',  x1: 0,     y1: 0,     x2: 0,     y2: 9000 },
    // Interior — corridor / room dividers
    { id: 'wall-i1', x1: 0,     y1: 4500,  x2: 7500,  y2: 4500 },
    { id: 'wall-i2', x1: 7500,  y1: 0,     x2: 7500,  y2: 9000 },
    { id: 'wall-i3', x1: 0,     y1: 4500,  x2: 0,     y2: 4500 }, // stub — kitchen/living divider
  ];

  const elementMap: Record<string, WallElement> = {};
  for (const w of walls) {
    const wall: WallElement = {
      id: w.id,
      type: 'wall',
      properties: {
        StartX: { type: 'number', value: w.x1 },
        StartY: { type: 'number', value: w.y1 },
        EndX:   { type: 'number', value: w.x2 },
        EndY:   { type: 'number', value: w.y2 },
        Height: { type: 'number', value: 3000 },
        Width:  { type: 'number', value: 200 },
        Name:   { type: 'string', value: w.id },
      },
      propertySets: [],
      geometry: { type: 'curve', data: null },
      layerId: 'layer-walls',
      levelId: 'level-ground',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { _type: 'Point3D', x: Math.min(w.x1, w.x2), y: Math.min(w.y1, w.y2), z: 0 },
        max: { _type: 'Point3D', x: Math.max(w.x1, w.x2), y: Math.max(w.y1, w.y2), z: 3000 },
      },
      metadata: {
        id: w.id,
        createdBy: 'ai-fallback',
        createdAt: now,
        updatedAt: now,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };
    elementMap[w.id] = wall;
  }

  const projectName = deriveProjectName(prompt);
  return {
    id: `gen-fallback-${now}`,
    name: projectName,
    version: { clock: {} },
    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: 'ai-fallback',
      schemaVersion: '1.0.0',
    },
    content: { elements: elementMap, spaces: {} },
    organization: {
      layers: {
        'layer-walls': { id: 'layer-walls', name: 'Walls', color: '#4a90d9', visible: true, locked: false, order: 0 },
        'layer-doors': { id: 'layer-doors', name: 'Doors', color: '#e67e22', visible: true, locked: false, order: 1 },
        'layer-windows': { id: 'layer-windows', name: 'Windows', color: '#27ae60', visible: true, locked: false, order: 2 },
      },
      levels: {
        'level-ground': { id: 'level-ground', name: 'Ground Floor', elevation: 0, height: 3000, order: 0 },
        'level-first':  { id: 'level-first', name: 'First Floor', elevation: 3000, height: 3000, order: 1 },
      },
    },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveProjectName(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('bedroom')) {
    const m = lower.match(/(\d+)\s*[-]?\s*bedroom/);
    if (m?.[1]) return `${m[1]}-Bedroom House`;
  }
  if (lower.includes('office')) return 'Office Building';
  if (lower.includes('apartment')) return 'Apartment';
  if (lower.includes('studio')) return 'Studio';
  return 'Generated Project';
}

/**
 * Try to extract a JSON object from text that may contain trailing prose.
 * Returns parsed object or null.
 */
function extractJson(text: string): Record<string, unknown> | null {
  // Try raw parse first
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch { /* fall through */ }

  // Scan for first { ... } block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isValidDocumentSchema(obj: unknown): obj is GenerateProjectResult['document'] {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o['id'] === 'string' &&
    o['content'] != null &&
    typeof (o['content'] as Record<string, unknown>)['elements'] === 'object'
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generateProject(
  options: GenerateProjectOptions
): Promise<GenerateProjectResult> {
  const { prompt, apiKey } = options;
  const warnings: string[] = [];

  // ── No API key — return template immediately ──────────────────────────────
  if (!apiKey || apiKey.trim() === '') {
    warnings.push('No API key provided — using fallback template. Set an Anthropic API key for AI-generated plans.');
    const doc = buildFallbackTemplate(prompt);
    const elementCount = Object.keys(doc.content?.elements ?? {}).length;
    return {
      document: doc,
      description: `Fallback 2-bedroom house template (${elementCount} elements). Provide an Anthropic API key to generate a custom floor plan.`,
      warnings,
    };
  }

  // ── Call Anthropic API ────────────────────────────────────────────────────
  let rawText = '';
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8096,
        system: GENERATE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      warnings.push(`API error ${resp.status}: ${errText} — using fallback template.`);
      const doc = buildFallbackTemplate(prompt);
      return {
        document: doc,
        description: `Fallback 2-bedroom house template (${Object.keys(doc.content?.elements ?? {}).length} elements).`,
        warnings,
      };
    }

    // Collect SSE stream
    const reader = resp.body?.getReader();
    if (!reader) {
      warnings.push('No response body — using fallback template.');
      const doc = buildFallbackTemplate(prompt);
      return {
        document: doc,
        description: `Fallback 2-bedroom house template.`,
        warnings,
      };
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        try {
          const json = JSON.parse(data) as {
            type: string;
            delta?: { type: string; text?: string };
          };
          if (json.type === 'content_block_delta' && json.delta?.text) {
            rawText += json.delta.text;
          } else if (json.type === 'message_stop') {
            break;
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  } catch (err) {
    warnings.push(`Network error: ${err instanceof Error ? err.message : String(err)} — using fallback template.`);
    const doc = buildFallbackTemplate(prompt);
    return {
      document: doc,
      description: `Fallback 2-bedroom house template (${Object.keys(doc.content?.elements ?? {}).length} elements).`,
      warnings,
    };
  }

  // ── Parse response ────────────────────────────────────────────────────────
  const parsed = extractJson(rawText.trim());

  if (!parsed || !isValidDocumentSchema(parsed)) {
    warnings.push('AI response was not valid DocumentSchema JSON — using fallback template.');
    const doc = buildFallbackTemplate(prompt);
    return {
      document: doc,
      description: `Fallback 2-bedroom house template (${Object.keys(doc.content?.elements ?? {}).length} elements).`,
      warnings,
    };
  }

  const doc = parsed as GenerateProjectResult['document'];
  const elementCount = Object.keys(doc.content?.elements ?? {}).length;
  const wallCount = Object.values(doc.content?.elements ?? {}).filter(
    (e) => (e as WallElement).type === 'wall'
  ).length;

  return {
    document: doc,
    description: `Generated "${doc.name ?? 'project'}" with ${elementCount} elements (${wallCount} walls).`,
    warnings,
  };
}
