/**
 * Render settings unit tests.
 * T-RENDER-003: Render settings — type correctness and THREE constant mapping.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  DEFAULT_RENDER_SETTINGS,
  toThreeToneMapping,
  toThreeShadowType,
  applyPreset,
  RENDER_PRESETS,
  type ToneMappingOption,
  type ShadowTypeOption,
} from './renderSettings';

describe('T-RENDER-003: Render settings', () => {
  // ── DEFAULT_RENDER_SETTINGS validity ────────────────────────────────────

  it('DEFAULT_RENDER_SETTINGS has valid ssaoRadius range (0–2)', () => {
    expect(DEFAULT_RENDER_SETTINGS.ssaoRadius).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RENDER_SETTINGS.ssaoRadius).toBeLessThanOrEqual(2);
  });

  it('DEFAULT_RENDER_SETTINGS has valid ssaoIntensity range (0–1)', () => {
    expect(DEFAULT_RENDER_SETTINGS.ssaoIntensity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RENDER_SETTINGS.ssaoIntensity).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_RENDER_SETTINGS has valid bloomStrength range (0–2)', () => {
    expect(DEFAULT_RENDER_SETTINGS.bloomStrength).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RENDER_SETTINGS.bloomStrength).toBeLessThanOrEqual(2);
  });

  it('DEFAULT_RENDER_SETTINGS has valid bloomRadius range (0–1)', () => {
    expect(DEFAULT_RENDER_SETTINGS.bloomRadius).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RENDER_SETTINGS.bloomRadius).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_RENDER_SETTINGS has valid bloomThreshold range (0–1)', () => {
    expect(DEFAULT_RENDER_SETTINGS.bloomThreshold).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RENDER_SETTINGS.bloomThreshold).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_RENDER_SETTINGS has valid exposure range (0.5–3)', () => {
    expect(DEFAULT_RENDER_SETTINGS.exposure).toBeGreaterThanOrEqual(0.5);
    expect(DEFAULT_RENDER_SETTINGS.exposure).toBeLessThanOrEqual(3);
  });

  it('DEFAULT_RENDER_SETTINGS has valid shadowIntensity range (0–1)', () => {
    expect(DEFAULT_RENDER_SETTINGS.shadowIntensity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RENDER_SETTINGS.shadowIntensity).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_RENDER_SETTINGS shadows are enabled by default', () => {
    expect(DEFAULT_RENDER_SETTINGS.shadows).toBe(true);
  });

  it('DEFAULT_RENDER_SETTINGS ssao is a boolean', () => {
    expect(typeof DEFAULT_RENDER_SETTINGS.ssao).toBe('boolean');
  });

  it('DEFAULT_RENDER_SETTINGS bloom is disabled by default', () => {
    expect(DEFAULT_RENDER_SETTINGS.bloom).toBe(false);
  });

  it('DEFAULT_RENDER_SETTINGS toneMapping is ACESFilmic', () => {
    expect(DEFAULT_RENDER_SETTINGS.toneMapping).toBe('ACESFilmic');
  });

  // ── toThreeToneMapping ───────────────────────────────────────────────────

  it('all tone mapping options map to valid THREE.ToneMapping values', () => {
    const options: ToneMappingOption[] = ['None', 'Reinhard', 'Cineon', 'ACESFilmic'];
    // Valid THREE tone mapping constants
    const validValues = new Set([
      THREE.NoToneMapping,
      THREE.LinearToneMapping,
      THREE.ReinhardToneMapping,
      THREE.CineonToneMapping,
      THREE.ACESFilmicToneMapping,
    ]);
    for (const opt of options) {
      const mapped = toThreeToneMapping(opt);
      expect(validValues.has(mapped)).toBe(true);
    }
  });

  it('toThreeToneMapping("None") returns THREE.NoToneMapping', () => {
    expect(toThreeToneMapping('None')).toBe(THREE.NoToneMapping);
  });

  it('toThreeToneMapping("Reinhard") returns THREE.ReinhardToneMapping', () => {
    expect(toThreeToneMapping('Reinhard')).toBe(THREE.ReinhardToneMapping);
  });

  it('toThreeToneMapping("Cineon") returns THREE.CineonToneMapping', () => {
    expect(toThreeToneMapping('Cineon')).toBe(THREE.CineonToneMapping);
  });

  it('toThreeToneMapping("ACESFilmic") returns THREE.ACESFilmicToneMapping', () => {
    expect(toThreeToneMapping('ACESFilmic')).toBe(THREE.ACESFilmicToneMapping);
  });

  // ── toThreeShadowType ────────────────────────────────────────────────────

  it('shadow type maps to THREE shadow constants', () => {
    const options: ShadowTypeOption[] = ['Basic', 'PCF', 'PCFSoft'];
    const validValues = new Set([
      THREE.BasicShadowMap,
      THREE.PCFShadowMap,
      THREE.PCFSoftShadowMap,
      THREE.VSMShadowMap,
    ]);
    for (const opt of options) {
      const mapped = toThreeShadowType(opt);
      expect(validValues.has(mapped)).toBe(true);
    }
  });

  it('toThreeShadowType("Basic") returns THREE.BasicShadowMap', () => {
    expect(toThreeShadowType('Basic')).toBe(THREE.BasicShadowMap);
  });

  it('toThreeShadowType("PCF") returns THREE.PCFShadowMap', () => {
    expect(toThreeShadowType('PCF')).toBe(THREE.PCFShadowMap);
  });

  it('toThreeShadowType("PCFSoft") returns THREE.PCFSoftShadowMap', () => {
    expect(toThreeShadowType('PCFSoft')).toBe(THREE.PCFSoftShadowMap);
  });

  // ── RENDER_PRESETS ───────────────────────────────────────────────────────

  it('Presentation preset enables ssao and bloom', () => {
    expect(RENDER_PRESETS['Presentation'].ssao).toBe(true);
    expect(RENDER_PRESETS['Presentation'].bloom).toBe(true);
  });

  it('Technical Drawing preset disables ssao, bloom, and shadows', () => {
    expect(RENDER_PRESETS['Technical Drawing'].ssao).toBe(false);
    expect(RENDER_PRESETS['Technical Drawing'].bloom).toBe(false);
    expect(RENDER_PRESETS['Technical Drawing'].shadows).toBe(false);
  });

  it('Wireframe preset disables ssao and bloom', () => {
    expect(RENDER_PRESETS['Wireframe'].ssao).toBe(false);
    expect(RENDER_PRESETS['Wireframe'].bloom).toBe(false);
  });

  // ── applyPreset ──────────────────────────────────────────────────────────

  it('applyPreset merges preset over current settings', () => {
    const result = applyPreset(DEFAULT_RENDER_SETTINGS, 'Presentation');
    expect(result.ssao).toBe(true);
    expect(result.bloom).toBe(true);
    // Non-overridden fields preserved
    expect(result.groundReflections).toBe(DEFAULT_RENDER_SETTINGS.groundReflections);
  });

  it('applyPreset does not mutate the original settings object', () => {
    const original = { ...DEFAULT_RENDER_SETTINGS };
    applyPreset(DEFAULT_RENDER_SETTINGS, 'Technical Drawing');
    expect(DEFAULT_RENDER_SETTINGS.ssao).toBe(original.ssao);
    expect(DEFAULT_RENDER_SETTINGS.shadows).toBe(original.shadows);
  });
});
