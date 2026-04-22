/**
 * Procedural environment maps for the photoreal renderer.
 *
 * Each preset returns a `Texture` suitable for `scene.environment` (and
 * optionally `scene.background`) plus a human-readable label. Presets
 * are built on-demand with `PMREMGenerator` so we don't ship HDR binary
 * assets in the bundle — everything is generated in the browser.
 *
 * Presets:
 *   - studio:   RoomEnvironment (indoor soft box, neutral)
 *   - outdoor:  Sky addon with sun disc at the current scene-store sun
 *   - sunset:   Sky addon with a low sun and warm turbidity
 *   - overcast: Grey dome built from a gradient CubeTexture
 *   - night:    Black void with faint ambient (renders silhouettes only)
 */
import * as THREE from 'three';

export type EnvPresetId = 'studio' | 'outdoor' | 'sunset' | 'overcast' | 'night';

export interface EnvPreset {
  id: EnvPresetId;
  /** Processed cube texture suitable for `scene.environment`. */
  envMap: THREE.Texture;
  /** Optional background — `null` keeps the existing background. */
  background: THREE.Texture | THREE.Color | null;
}

export interface SunDir {
  azimuthDeg: number;
  elevationDeg: number;
}

/**
 * Build the selected environment preset against the provided renderer so
 * the resulting PMREM cube texture is on the same WebGL context as the
 * path-tracer.
 */
export async function buildEnvPreset(
  preset: EnvPresetId,
  renderer: THREE.WebGLRenderer,
  sun: SunDir,
): Promise<EnvPreset> {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  switch (preset) {
    case 'studio':
      return buildStudio(pmrem);
    case 'outdoor':
      return buildSky(pmrem, sun, { turbidity: 5, rayleigh: 2, sky: 0xbfd5ff });
    case 'sunset':
      return buildSky(pmrem, { ...sun, elevationDeg: Math.min(10, sun.elevationDeg) }, { turbidity: 8, rayleigh: 3, sky: 0xff9f66 });
    case 'overcast':
      return buildOvercast(pmrem);
    case 'night':
      return buildNight(pmrem);
  }
}

// ─── Studio ──────────────────────────────────────────────────────────────────

async function buildStudio(pmrem: THREE.PMREMGenerator): Promise<EnvPreset> {
  // RoomEnvironment is an internal three scene that PMREM can convolve.
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const room = new RoomEnvironment();
  const cube = pmrem.fromScene(room, 0.04);
  pmrem.dispose();
  return {
    id: 'studio',
    envMap: cube.texture,
    background: new THREE.Color(0x2a2a2a),
  };
}

// ─── Sky (outdoor / sunset) ──────────────────────────────────────────────────

interface SkyOpts {
  turbidity: number;
  rayleigh: number;
  /** Sky tint at horizon. */
  sky: number;
}

async function buildSky(
  pmrem: THREE.PMREMGenerator,
  sun: SunDir,
  opts: SkyOpts,
): Promise<EnvPreset> {
  const { Sky } = await import('three/examples/jsm/objects/Sky.js');
  const sky = new Sky();
  sky.scale.setScalar(450_000);
  sky.material.uniforms['turbidity'].value = opts.turbidity;
  sky.material.uniforms['rayleigh'].value = opts.rayleigh;
  sky.material.uniforms['mieCoefficient'].value = 0.005;
  sky.material.uniforms['mieDirectionalG'].value = 0.8;

  // Three.js Sky expects a unit direction for the sun.
  const el = (sun.elevationDeg * Math.PI) / 180;
  const az = (sun.azimuthDeg * Math.PI) / 180;
  const sunPos = new THREE.Vector3(
     Math.sin(az) * Math.cos(el),
     Math.sin(el),
    -Math.cos(az) * Math.cos(el),
  );
  sky.material.uniforms['sunPosition'].value.copy(sunPos);

  // Render the sky as a small scene and feed it to PMREM.
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  const cube = pmrem.fromScene(skyScene);
  pmrem.dispose();

  // Also export a background texture identical to the env — users see sky
  // through windows in the render. Tint through sky color as a soft fog
  // fallback where Sky isn't sampled.
  return {
    id: opts.rayleigh > 2.5 ? 'sunset' : 'outdoor',
    envMap: cube.texture,
    background: cube.texture,
  };
}

// ─── Overcast ────────────────────────────────────────────────────────────────

function buildOvercast(pmrem: THREE.PMREMGenerator): EnvPreset {
  // A simple grey gradient top→horizon, convolved as a PMREM so it
  // provides diffuse IBL without specular highlights.
  const scene = new THREE.Scene();
  const geom = new THREE.SphereGeometry(500, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0xdedede) },
      bottom: { value: new THREE.Color(0x9a9a9a) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPosition;
      uniform vec3 top;
      uniform vec3 bottom;
      void main() {
        float h = clamp(normalize(vWorldPosition).y * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, h), 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(geom, mat));
  const cube = pmrem.fromScene(scene);
  pmrem.dispose();
  return {
    id: 'overcast',
    envMap: cube.texture,
    background: cube.texture,
  };
}

// ─── Night ───────────────────────────────────────────────────────────────────

function buildNight(pmrem: THREE.PMREMGenerator): EnvPreset {
  const scene = new THREE.Scene();
  const geom = new THREE.SphereGeometry(500, 16, 12);
  const mat = new THREE.MeshBasicMaterial({ color: 0x0a0d14, side: THREE.BackSide });
  scene.add(new THREE.Mesh(geom, mat));
  const cube = pmrem.fromScene(scene);
  pmrem.dispose();
  return {
    id: 'night',
    envMap: cube.texture,
    background: new THREE.Color(0x05070c),
  };
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
