/**
 * T-2D-009: Hatch patterns — architectural fill patterns for sections and plans
 */

export type HatchPatternType =
  | 'solid'
  | 'diagonal'
  | 'cross-hatch'
  | 'brick'
  | 'concrete'
  | 'insulation'
  | 'earth'
  | 'steel'
  | 'wood-grain'
  | 'tile';

export interface HatchPattern {
  id: string;
  name: string;
  type: HatchPatternType;
  angle: number;       // degrees
  spacing: number;     // mm at 1:1
  lineWeight: number;  // pt
  description: string;
}

export interface HatchLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const HATCH_PATTERNS: HatchPattern[] = [
  {
    id: 'solid',
    name: 'Solid Fill',
    type: 'solid',
    angle: 0,
    spacing: 0,
    lineWeight: 0,
    description: 'Solid fill with no lines',
  },
  {
    id: 'diagonal-45',
    name: 'Diagonal 45°',
    type: 'diagonal',
    angle: 45,
    spacing: 3,
    lineWeight: 0.18,
    description: 'Single diagonal lines at 45 degrees',
  },
  {
    id: 'diagonal-135',
    name: 'Diagonal 135°',
    type: 'diagonal',
    angle: 135,
    spacing: 3,
    lineWeight: 0.18,
    description: 'Single diagonal lines at 135 degrees',
  },
  {
    id: 'cross-hatch',
    name: 'Cross Hatch',
    type: 'cross-hatch',
    angle: 45,
    spacing: 3,
    lineWeight: 0.18,
    description: 'Crossed diagonal lines (steel section)',
  },
  {
    id: 'brick',
    name: 'Brick',
    type: 'brick',
    angle: 0,
    spacing: 75,
    lineWeight: 0.25,
    description: 'Brick coursing pattern',
  },
  {
    id: 'concrete',
    name: 'Concrete',
    type: 'concrete',
    angle: 0,
    spacing: 10,
    lineWeight: 0.18,
    description: 'Concrete stipple pattern',
  },
  {
    id: 'insulation',
    name: 'Insulation',
    type: 'insulation',
    angle: 0,
    spacing: 6,
    lineWeight: 0.18,
    description: 'Zigzag insulation pattern',
  },
  {
    id: 'earth',
    name: 'Earth / Ground',
    type: 'earth',
    angle: 45,
    spacing: 5,
    lineWeight: 0.25,
    description: 'Earth and ground material',
  },
  {
    id: 'steel',
    name: 'Steel Section',
    type: 'steel',
    angle: 45,
    spacing: 2,
    lineWeight: 0.18,
    description: 'Dense cross-hatch for steel sections',
  },
  {
    id: 'wood-grain',
    name: 'Wood Grain',
    type: 'wood-grain',
    angle: 0,
    spacing: 4,
    lineWeight: 0.13,
    description: 'Wavy lines representing wood grain',
  },
];

export function getHatchPatternById(id: string): HatchPattern | undefined {
  return HATCH_PATTERNS.find((p) => p.id === id);
}

export function getHatchPatternsByType(type: HatchPatternType): HatchPattern[] {
  return HATCH_PATTERNS.filter((p) => p.type === type);
}

export interface HatchFillOptions {
  pattern: HatchPattern;
  bounds: { x: number; y: number; width: number; height: number };
  scale?: number;
}

export function generateHatchLines(options: HatchFillOptions): HatchLine[] {
  const { pattern, bounds, scale = 1 } = options;
  const lines: HatchLine[] = [];

  if (pattern.type === 'solid' || pattern.spacing <= 0) {
    return lines;
  }

  const spacing = pattern.spacing * scale;
  const { x, y, width, height } = bounds;

  if (pattern.type === 'diagonal' || pattern.type === 'earth') {
    const rad = (pattern.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const diag = Math.sqrt(width * width + height * height);
    const steps = Math.ceil(diag / spacing) + 2;
    const cx = x + width / 2;
    const cy = y + height / 2;

    for (let i = -steps; i <= steps; i++) {
      const offset = i * spacing;
      const px = cx + offset * (-sin);
      const py = cy + offset * cos;
      lines.push({
        x1: px - cos * diag,
        y1: py - sin * diag,
        x2: px + cos * diag,
        y2: py + sin * diag,
      });
    }
    return lines;
  }

  if (pattern.type === 'cross-hatch' || pattern.type === 'steel') {
    const diag = Math.sqrt(width * width + height * height);
    const steps = Math.ceil(diag / spacing) + 2;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const angles = [45, 135];

    for (const angleDeg of angles) {
      const rad = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      for (let i = -steps; i <= steps; i++) {
        const offset = i * spacing;
        const px = cx + offset * (-sin);
        const py = cy + offset * cos;
        lines.push({
          x1: px - cos * diag,
          y1: py - sin * diag,
          x2: px + cos * diag,
          y2: py + sin * diag,
        });
      }
    }
    return lines;
  }

  // Horizontal/vertical based patterns (brick, concrete, etc.)
  for (let iy = y; iy <= y + height; iy += spacing) {
    lines.push({ x1: x, y1: iy, x2: x + width, y2: iy });
  }

  return lines;
}

export interface HatchApplyOptions {
  patternId: string;
  color?: string;
  opacity?: number;
  scale?: number;
}

export function getDefaultHatchColor(pattern: HatchPattern): string {
  const colorMap: Partial<Record<HatchPatternType, string>> = {
    concrete: '#808080',
    brick: '#c1440e',
    steel: '#4a4a4a',
    insulation: '#f5e6c8',
    earth: '#8b6914',
    wood_grain: '#d2a679',
  } as Partial<Record<HatchPatternType, string>>;
  return colorMap[pattern.type] ?? '#000000';
}
