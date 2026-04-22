/**
 * Procedural environment maps for the photoreal renderer.
 *
 * three-gpu-pathtracer's `EquirectHdrInfoUniform` requires
 * scene.environment to be an **equirectangular** HDR DataTexture so it
 * can compute importance-sampling CDFs over the env map. PMREM output
 * (what the live viewport uses) is a cube-packed structure with a
 * different `image.data` layout — feeding it in causes `updateFrom` to
 * reach into undefined offsets and throw 'Cannot read properties of
 * undefined (reading \'0\')'.
 *
 * So these presets emit raw equirectangular HalfFloat DataTextures
 * built on the main thread — no HDR binary assets, no PMREM, and no
 * worker. The render quality is low compared to a real HDRI but
 * faithful enough for the presets we expose (Studio / Outdoor /
 * Sunset / Overcast / Night), and the scene.environment slot the live
 * viewport reads is compatible with equirectangular maps too so the
 * rasterised view picks up consistent IBL.
 *
 * The sun direction feeds a soft hotspot in Outdoor and Sunset so
 * glass/glossy materials catch a believable highlight at the angle
 * matching the project's geolocation + time.
 */
import * as THREE from 'three';

export type EnvPresetId = 'studio' | 'outdoor' | 'sunset' | 'overcast' | 'night';

export interface EnvPreset {
  id: EnvPresetId;
  envMap: THREE.DataTexture;
  /** Optional background for the live view. Same texture works for both. */
  background: THREE.DataTexture | THREE.Color | null;
}

export interface SunDir {
  azimuthDeg: number;
  elevationDeg: number;
}

// ─── Core equirectangular builder ────────────────────────────────────────────

type Shader = (u: number, v: number, sunUV: { x: number; y: number } | null) => [number, number, number];

const W = 512;
const H = 256;

function makeEquirect(id: EnvPresetId, shader: Shader, sun: SunDir | null): THREE.DataTexture {
  const sunUV = sun ? sunDirectionToUV(sun) : null;
  const data = new Uint16Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const [r, g, b] = shader(u, v, sunUV);
      const i = (y * W + x) * 4;
      data[i] = THREE.DataUtils.toHalfFloat(r);
      data[i + 1] = THREE.DataUtils.toHalfFloat(g);
      data[i + 2] = THREE.DataUtils.toHalfFloat(b);
      data[i + 3] = THREE.DataUtils.toHalfFloat(1);
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  tex.name = `env-${id}`;
  return tex;
}

/** Convert sun (azimuth / elevation) into equirectangular UV coords. */
function sunDirectionToUV(sun: SunDir): { x: number; y: number } {
  // Azimuth 0° = +Z (south in our convention), wrapping clockwise.
  // Elevation 0° = horizon, 90° = zenith.
  const azRad = (sun.azimuthDeg * Math.PI) / 180;
  const x = (azRad / (2 * Math.PI) + 0.5) % 1;
  // Map elevation [0, 90] → v [0.5, 0] (top half of the image is sky).
  const y = 0.5 - (sun.elevationDeg / 180);
  return { x, y };
}

/** Squared angular distance on the equirect canvas, with x-wrap. */
function sunFalloff(u: number, v: number, sunUV: { x: number; y: number }, radius: number): number {
  let du = u - sunUV.x;
  if (du > 0.5) du -= 1;
  if (du < -0.5) du += 1;
  const dv = v - sunUV.y;
  const d2 = du * du + dv * dv;
  const r2 = radius * radius;
  return d2 >= r2 ? 0 : 1 - d2 / r2;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export async function buildEnvPreset(
  preset: EnvPresetId,
  _renderer: THREE.WebGLRenderer,
  sun: SunDir,
): Promise<EnvPreset> {
  switch (preset) {
    case 'studio': {
      // Uniform soft studio grey with very slight gradient — no hotspot.
      const shader: Shader = (_u, v) => {
        const top = 0.95;
        const bot = 0.70;
        const t = 1 - v;
        const g = bot + (top - bot) * t;
        return [g, g, g];
      };
      const env = makeEquirect('studio', shader, null);
      return { id: 'studio', envMap: env, background: new THREE.Color(0x2a2a2a) };
    }

    case 'outdoor': {
      // Daylight blue sky / green-grey ground with a soft sun hotspot.
      const shader: Shader = (u, v, sunUV) => {
        const isSky = v < 0.5;
        let r: number, g: number, b: number;
        if (isSky) {
          const t = 1 - v * 2;
          r = 0.45 + 0.35 * t;
          g = 0.65 + 0.25 * t;
          b = 0.90 + 0.10 * t;
        } else {
          const t = (v - 0.5) * 2;
          r = 0.35 - 0.15 * t;
          g = 0.37 - 0.12 * t;
          b = 0.28 - 0.10 * t;
        }
        if (sunUV) {
          const f = sunFalloff(u, v, sunUV, 0.04);
          if (f > 0) {
            const i = 6 * f * f;
            r += i; g += i; b += 0.9 * i;
          }
        }
        return [r, g, b];
      };
      const env = makeEquirect('outdoor', shader, sun);
      return { id: 'outdoor', envMap: env, background: env };
    }

    case 'sunset': {
      // Warm horizon with orange-red sun hotspot at low elevation.
      const lowSun: SunDir = { ...sun, elevationDeg: Math.min(10, sun.elevationDeg) };
      const shader: Shader = (u, v, sunUV) => {
        const t = 1 - v;
        let r = 0.95 * (0.35 + 0.55 * t);
        let g = 0.55 * (0.25 + 0.45 * t);
        let b = 0.40 * (0.20 + 0.30 * t);
        if (sunUV) {
          const f = sunFalloff(u, v, sunUV, 0.06);
          if (f > 0) {
            const i = 8 * f * f;
            r += 1.2 * i; g += 0.7 * i; b += 0.3 * i;
          }
        }
        return [r, g, b];
      };
      const env = makeEquirect('sunset', shader, lowSun);
      return { id: 'sunset', envMap: env, background: env };
    }

    case 'overcast': {
      // Flat grey dome — no sun hotspot; slight top/bottom gradient.
      const shader: Shader = (_u, v) => {
        const t = 1 - v;
        const top = 0.88;
        const bot = 0.55;
        const g = bot + (top - bot) * t;
        return [g, g, g];
      };
      const env = makeEquirect('overcast', shader, null);
      return { id: 'overcast', envMap: env, background: env };
    }

    case 'night': {
      // Near-black with a very faint cool tint so silhouettes read.
      const shader: Shader = () => [0.02, 0.03, 0.06];
      const env = makeEquirect('night', shader, null);
      return { id: 'night', envMap: env, background: new THREE.Color(0x05070c) };
    }
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const ENV_PRESET_ORDER: EnvPresetId[] = ['studio', 'outdoor', 'sunset', 'overcast', 'night'];

export const ENV_PRESET_LABELS: Record<EnvPresetId, string> = {
  studio: 'Studio',
  outdoor: 'Outdoor',
  sunset: 'Sunset',
  overcast: 'Overcast',
  night: 'Night',
};
