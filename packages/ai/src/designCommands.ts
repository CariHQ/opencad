/**
 * T-AI-010: AI Design Modification Commands
 *
 * Natural language command parser and applier for design modifications.
 */

/**
 * Minimal representation of a document element used by design commands.
 * Structurally compatible with @opencad/document's ElementSchema.
 */
export interface DesignElement {
  id: string;
  type: string;
  properties: Record<string, { type: string; value: string | number | boolean | string[] }>;
  propertySets: Array<{ id: string; name: string; properties: Record<string, unknown> }>;
  transform: {
    translation: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  [key: string]: unknown;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DesignCommand =
  | { type: 'scale'; factor: number; target: 'all' | 'selected' }
  | { type: 'rotate'; degrees: number; target: 'all' | 'selected' }
  | { type: 'translate'; dx: number; dy: number; target: 'all' | 'selected' }
  | { type: 'setMaterial'; material: string; target: 'all' | 'selected' }
  | { type: 'unknown'; raw: string };

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses a natural language design command string into a typed DesignCommand.
 *
 * Supported patterns (case-insensitive):
 *   "scale by <number>"          → scale
 *   "rotate <number> degrees"    → rotate
 *   "move left|right <number>"   → translate (dx = ±n, dy = 0)
 *   "move up|down <number>"      → translate (dx = 0, dy = ±n)
 *   "set material to <name>"     → setMaterial
 *   anything else                → unknown
 */
export function parseDesignCommand(text: string): DesignCommand {
  const t = text.trim().toLowerCase();

  if (!t) {
    return { type: 'unknown', raw: text };
  }

  // scale by <factor>
  const scaleMatch = t.match(/^scale\s+by\s+([\d.]+)$/);
  if (scaleMatch) {
    const factor = parseFloat(scaleMatch[1]!);
    if (!isNaN(factor)) {
      return { type: 'scale', factor, target: 'all' };
    }
  }

  // rotate <degrees> degrees
  const rotateMatch = t.match(/^rotate\s+([\d.]+)\s+degrees?$/);
  if (rotateMatch) {
    const degrees = parseFloat(rotateMatch[1]!);
    if (!isNaN(degrees)) {
      return { type: 'rotate', degrees, target: 'all' };
    }
  }

  // move left|right|up|down <distance>
  const translateMatch = t.match(/^move\s+(left|right|up|down)\s+([\d.]+)$/);
  if (translateMatch) {
    const direction = translateMatch[1]!;
    const distance = parseFloat(translateMatch[2]!);
    if (!isNaN(distance)) {
      let dx = 0;
      let dy = 0;
      if (direction === 'left') dx = -distance;
      else if (direction === 'right') dx = distance;
      else if (direction === 'up') dy = distance;
      else if (direction === 'down') dy = -distance;
      return { type: 'translate', dx, dy, target: 'all' };
    }
  }

  // set material to <name>
  const materialMatch = t.match(/^set\s+material\s+to\s+(\S+)$/);
  if (materialMatch) {
    return { type: 'setMaterial', material: materialMatch[1]!, target: 'all' };
  }

  return { type: 'unknown', raw: text };
}

// ─── Applier ──────────────────────────────────────────────────────────────────

/**
 * Applies a DesignCommand to a copy of the elements map.
 * Does NOT mutate the original map.
 *
 * - scale: multiplies transform.scale (x, y, z) by the factor
 * - rotate: sets transform.rotation.z to the given degrees
 * - translate: adds dx/dy to transform.translation.x/y
 * - setMaterial: sets properties.Material.value to the given material
 * - unknown: returns a shallow copy of the elements map unchanged
 */
export function applyDesignCommand(
  command: DesignCommand,
  elements: Record<string, DesignElement>
): Record<string, DesignElement> {
  if (command.type === 'unknown') {
    // Return a copy without modifications
    return Object.fromEntries(
      Object.entries(elements).map(([id, el]) => [id, { ...el }])
    );
  }

  const result: Record<string, DesignElement> = {};

  for (const [id, element] of Object.entries(elements)) {
    const el = deepCloneElement(element);

    switch (command.type) {
      case 'scale': {
        el.transform = {
          ...el.transform,
          scale: {
            x: command.factor,
            y: command.factor,
            z: command.factor,
          },
        };
        break;
      }
      case 'rotate': {
        el.transform = {
          ...el.transform,
          rotation: {
            ...el.transform.rotation,
            z: command.degrees,
          },
        };
        break;
      }
      case 'translate': {
        el.transform = {
          ...el.transform,
          translation: {
            x: el.transform.translation.x + command.dx,
            y: el.transform.translation.y + command.dy,
            z: el.transform.translation.z,
          },
        };
        break;
      }
      case 'setMaterial': {
        el.properties = {
          ...el.properties,
          Material: { type: 'string', value: command.material },
        };
        break;
      }
    }

    result[id] = el;
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deepCloneElement(el: DesignElement): DesignElement {
  return {
    ...el,
    properties: { ...el.properties },
    transform: {
      translation: { ...el.transform.translation },
      rotation: { ...el.transform.rotation },
      scale: { ...el.transform.scale },
    },
    propertySets: el.propertySets.map((ps) => ({ ...ps, properties: { ...ps.properties } })),
  };
}
