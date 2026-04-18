/**
 * FloorPlanGenerator
 * T-AI-001, T-AI-005
 *
 * Converts natural-language prompts into DocumentSchema floor plans by calling
 * the Anthropic Claude API.  Validation (T-AI-002 / T-AI-003) is applied before
 * the schema is returned; if IBC minimums are violated the request is retried
 * once with the violations noted.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { DocumentSchema, ElementSchema, PropertyValue } from '@opencad/document';
import { validateRoomSizes } from './floorPlanValidation';

// ─── Constructor options ───────────────────────────────────────────────────────

export interface FloorPlanGeneratorOptions {
  apiKey?: string;
  model?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert residential architect. Your task is to produce valid JSON
that conforms exactly to the OpenCAD DocumentSchema format.

The schema has this top-level structure:
{
  "id": "<uuid>",
  "name": "<string>",
  "version": { "clock": {} },
  "metadata": { "createdAt": <ms>, "updatedAt": <ms>, "createdBy": "ai", "schemaVersion": "1.0.0" },
  "content": {
    "elements": { "<id>": <ElementSchema>, ... },
    "spaces": {}
  },
  "organization": {
    "layers": { "layer-default": { "id": "layer-default", "name": "Layer 1", "color": "#808080", "visible": true, "locked": false, "order": 0 } },
    "levels": { "level-ground": { "id": "level-ground", "name": "Ground Floor", "elevation": 0, "height": 3000, "order": 0 } }
  },
  "presentation": { "views": {}, "annotations": {} },
  "library": { "materials": {} }
}

Each room must be an ElementSchema with type "space" and these properties (all values in metres):
  Name:     { "type": "string", "value": "<room name>" }
  Width:    { "type": "number", "value": <width>, "unit": "m" }
  Depth:    { "type": "number", "value": <depth>, "unit": "m" }
  Area:     { "type": "number", "value": <width * depth>, "unit": "m²" }
  X:        { "type": "number", "value": <x origin> }
  Y:        { "type": "number", "value": <y origin> }
  RoomType: { "type": "string", "value": "<bedroom|bathroom|living|kitchen|hallway|dining|other>" }
  ConnectsTo: { "type": "string", "value": "<id of hallway or entry element this room directly connects to>" }

The boundingBox must match the Width/Depth/X/Y values:
  "boundingBox": { "min": { "x": X, "y": Y, "z": 0, "_type": "Point3D" }, "max": { "x": X+Width, "y": Y+Depth, "z": 0, "_type": "Point3D" } }

Each ElementSchema also needs:
  "id": "<unique id like space-bedroom-1>",
  "type": "space",
  "propertySets": [],
  "geometry": { "type": "brep", "data": null },
  "layerId": "layer-default",
  "levelId": "level-ground",
  "transform": { "translation": {"x":0,"y":0,"z":0}, "rotation": {"x":0,"y":0,"z":0}, "scale": {"x":1,"y":1,"z":1} },
  "metadata": { "id": "<same id>", "createdBy": "ai", "createdAt": <ms>, "updatedAt": <ms>, "version": { "clock": {} } },
  "visible": true,
  "locked": false

IBC compliance rules you MUST follow:
- Bedrooms: area ≥ 7.43 m² (80 sq ft)
- Bathrooms: area ≥ 2.23 m² (24 sq ft)
- Living/dining rooms: area ≥ 13.0 m²
- Include at least one hallway element with RoomType "hallway"
- Every room should have ConnectsTo pointing to the hallway id

Return ONLY the JSON object — no markdown fences, no prose.`;

function buildUserPrompt(prompt: string, retryNote?: string): string {
  const now = Date.now();
  const base = `Generate a complete OpenCAD DocumentSchema floor plan for:
"${prompt}"

Current timestamp (use for createdAt/updatedAt): ${now}`;
  if (retryNote) {
    return `${base}

IMPORTANT — previous attempt had IBC violations, please fix them:
${retryNote}`;
  }
  return base;
}

function buildModifyPrompt(existing: DocumentSchema, instruction: string): string {
  return `You have an existing OpenCAD DocumentSchema floor plan (provided as JSON below).
Apply ONLY this change: "${instruction}"

Rules:
1. Preserve ALL existing element IDs — do not rename or remove any element.
2. Only change the properties relevant to the instruction.
3. Return the complete, updated DocumentSchema as plain JSON (no markdown).

Existing schema:
${JSON.stringify(existing, null, 2)}`;
}

function parseSchemaFromResponse(text: string): DocumentSchema {
  // Strip markdown fences if present
  const stripped = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  // Find the outermost JSON object
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in AI response');
  }
  const jsonText = stripped.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText) as DocumentSchema;
}

function mergeSchemas(original: DocumentSchema, updated: DocumentSchema): DocumentSchema {
  // Ensure all original IDs exist in the result (preserve unchanged elements)
  const mergedElements: Record<string, ElementSchema> = { ...updated.content.elements };
  for (const [id, el] of Object.entries(original.content.elements)) {
    if (!(id in mergedElements)) {
      mergedElements[id] = el;
    }
  }
  return {
    ...updated,
    content: { ...updated.content, elements: mergedElements },
    metadata: {
      ...updated.metadata,
      updatedAt: Date.now(),
    },
  };
}

// ─── FloorPlanGenerator ───────────────────────────────────────────────────────

export class FloorPlanGenerator {
  private client: Anthropic;
  private model: string;

  constructor(options: FloorPlanGeneratorOptions = {}) {
    this.client = new Anthropic({ apiKey: options.apiKey ?? '' });
    this.model = options.model ?? 'claude-haiku-4-5-20251001';
  }

  /**
   * Generate a floor plan DocumentSchema from a natural-language prompt.
   * Validates IBC minimums and retries once if violations are found.
   */
  async generateFloorPlan(prompt: string): Promise<DocumentSchema> {
    const schema = await this._callClaude(buildUserPrompt(prompt));

    // Validate IBC minimums — retry once if needed
    const violations = validateRoomSizes(schema);
    if (violations.length > 0) {
      const note = violations.map((v) => `- ${v.message}`).join('\n');
      const retried = await this._callClaude(buildUserPrompt(prompt, note));
      return retried;
    }

    return schema;
  }

  /**
   * Apply a natural-language modification to an existing schema.
   * Preserves all unchanged element IDs.
   */
  async modifyFloorPlan(existing: DocumentSchema, instruction: string): Promise<DocumentSchema> {
    const updated = await this._callClaude(buildModifyPrompt(existing, instruction));
    return mergeSchemas(existing, updated);
  }

  private async _callClaude(userPrompt: string): Promise<DocumentSchema> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: SYSTEM_PROMPT,
    });

    const firstBlock = response.content[0];
    if (!firstBlock || firstBlock.type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }

    return parseSchemaFromResponse(firstBlock.text);
  }
}

// ─── Property helpers (used by validation) ────────────────────────────────────

export function getNumericProp(
  props: Record<string, PropertyValue>,
  key: string
): number | undefined {
  const v = props[key];
  if (!v || v.type !== 'number') return undefined;
  return v.value as number;
}

export function getStringProp(
  props: Record<string, PropertyValue>,
  key: string
): string | undefined {
  const v = props[key];
  if (!v || v.type !== 'string') return undefined;
  return v.value as string;
}
