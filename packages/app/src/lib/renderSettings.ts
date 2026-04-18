/**
 * Render pipeline settings for the 3D viewport.
 * Phase II: PBR materials, shadows, post-processing, render export.
 */
import * as THREE from 'three';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ToneMappingOption = 'None' | 'Reinhard' | 'Cineon' | 'ACESFilmic';
export type ShadowTypeOption = 'Basic' | 'PCF' | 'PCFSoft';
export type RenderPreset = 'Presentation' | 'Technical Drawing' | 'Wireframe';

export interface RenderSettings {
  /** Screen-space ambient occlusion */
  ssao: boolean;
  ssaoRadius: number;      // 0–2
  ssaoIntensity: number;   // 0–1

  /** Bloom post-processing */
  bloom: boolean;
  bloomStrength: number;   // 0–2
  bloomRadius: number;     // 0–1
  bloomThreshold: number;  // 0–1

  /** Tone mapping */
  toneMapping: ToneMappingOption;
  exposure: number;        // 0.5–3

  /** Shadow settings */
  shadows: boolean;
  shadowType: ShadowTypeOption;
  shadowIntensity: number; // 0–1

  /** Environment */
  environmentMap: 'studio' | 'outdoor' | 'interior' | 'night' | 'none';
  groundReflections: boolean;
}

// ─── Defaults ──────────────────────────────────────────────────────────────

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  ssao: true,
  ssaoRadius: 0.5,
  ssaoIntensity: 0.5,

  bloom: false,
  bloomStrength: 0.3,
  bloomRadius: 0.5,
  bloomThreshold: 0.9,

  toneMapping: 'ACESFilmic',
  exposure: 1.0,

  shadows: true,
  shadowType: 'PCFSoft',
  shadowIntensity: 0.5,

  environmentMap: 'studio',
  groundReflections: false,
};

// ─── THREE constant mappings ────────────────────────────────────────────────

/**
 * Map a ToneMappingOption string to the THREE.ToneMapping numeric constant.
 */
export function toThreeToneMapping(opt: ToneMappingOption): THREE.ToneMapping {
  switch (opt) {
    case 'Reinhard':   return THREE.ReinhardToneMapping;
    case 'Cineon':     return THREE.CineonToneMapping;
    case 'ACESFilmic': return THREE.ACESFilmicToneMapping;
    case 'None':
    default:           return THREE.NoToneMapping;
  }
}

/**
 * Map a ShadowTypeOption string to the THREE.ShadowMapType numeric constant.
 */
export function toThreeShadowType(opt: ShadowTypeOption): THREE.ShadowMapType {
  switch (opt) {
    case 'PCF':     return THREE.PCFShadowMap;
    case 'PCFSoft': return THREE.PCFSoftShadowMap;
    case 'Basic':
    default:        return THREE.BasicShadowMap;
  }
}

// ─── Render presets ─────────────────────────────────────────────────────────

export const RENDER_PRESETS: Record<RenderPreset, Partial<RenderSettings>> = {
  Presentation: {
    ssao: true,
    ssaoRadius: 0.8,
    ssaoIntensity: 0.6,
    bloom: true,
    bloomStrength: 0.4,
    bloomRadius: 0.4,
    bloomThreshold: 0.85,
    toneMapping: 'ACESFilmic',
    exposure: 1.2,
    shadows: true,
    shadowType: 'PCFSoft',
    shadowIntensity: 0.6,
  },
  'Technical Drawing': {
    ssao: false,
    bloom: false,
    toneMapping: 'None',
    exposure: 1.0,
    shadows: false,
    shadowType: 'Basic',
    shadowIntensity: 0,
  },
  Wireframe: {
    ssao: false,
    bloom: false,
    toneMapping: 'None',
    exposure: 1.0,
    shadows: false,
    shadowType: 'Basic',
    shadowIntensity: 0,
  },
};

/**
 * Apply a named preset on top of existing settings.
 */
export function applyPreset(
  current: RenderSettings,
  preset: RenderPreset
): RenderSettings {
  return { ...current, ...RENDER_PRESETS[preset] };
}
