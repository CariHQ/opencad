/**
 * RenderingPanel — photoreal renderer (v2 of #333 T-VIZ-040).
 *
 * Styled to match SheetPanel / other right-panel UIs: label-left /
 * select-right rows inside a `sheet-properties`-shaped block, a solid
 * blue `btn-primary` action button at the bottom.
 *
 * Runs three-gpu-pathtracer against the live 3D scene with configurable
 * quality / resolution / environment presets and a sun driven from the
 * project's geolocation + date + time (reuses Solar panel data via
 * sceneStore.sun). On completion the PNG is saved as a 'render'-type
 * view so it appears in the View Map and can be dragged onto a sheet.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import { getLiveScene } from '../hooks/useThreeViewport';
import { useSceneStore } from '../stores/sceneStore';
import { useDocumentStore } from '../stores/documentStore';
import {
  buildEnvPreset,
  ENV_PRESET_LABELS,
  ENV_PRESET_ORDER,
  type EnvPresetId,
} from '../lib/renderEnvironments';
import { calculateSolarPosition } from '../lib/solarAnalysis';

// ─── Path-tracer dynamic import ──────────────────────────────────────────────

interface BVHGeneratorLike {
  generate: (geometry: THREE.BufferGeometry, options?: unknown) => Promise<unknown>;
}

type WebGLPathTracerCtor = new (renderer: THREE.WebGLRenderer) => {
  bounces: number;
  renderScale: number;
  renderToCanvas: boolean;
  samples: number;
  setBVHWorker: (worker: BVHGeneratorLike) => void;
  setSceneAsync: (scene: THREE.Scene, camera: THREE.Camera) => Promise<void>;
  renderSample: () => void;
  dispose: () => void;
};
let _cachedWebGLPathTracer: WebGLPathTracerCtor | null = null;
async function loadPathTracer(): Promise<WebGLPathTracerCtor> {
  if (_cachedWebGLPathTracer) return _cachedWebGLPathTracer;
  const mod = await import('three-gpu-pathtracer');
  _cachedWebGLPathTracer = mod.WebGLPathTracer as unknown as WebGLPathTracerCtor;
  return _cachedWebGLPathTracer;
}

/**
 * three-gpu-pathtracer's MaterialsTexture reads `texture.matrix.elements`
 * across every optional PBR slot (map, roughnessMap, normalMap,
 * clearcoatMap, transmissionMap, emissiveMap, sheenColorMap,
 * iridescenceMap, specularColorMap, and a dozen more). If ANY material
 * in the scene has one of those slots set to a texture-shaped object
 * whose `.matrix` isn't a real Matrix3, the whole render fails with:
 *   'Cannot read properties of undefined (reading \'0\')'
 *
 * The pathtracer has no guard for this — it trusts that anything with
 * `.isTexture === true` also has a valid `.matrix`. Under normal three
 * usage that's true, but PMREM outputs, render-target textures,
 * imported GLTF textures, and some third-party helpers can violate it.
 *
 * Rather than maintain a parallel "safe" scene, this walks the live
 * scene once and fixes any broken `.matrix` in place. Existing valid
 * matrices are left untouched, so user UV transforms are preserved.
 * Called once immediately before setSceneAsync.
 */
const TEXTURE_SLOTS = [
  'map', 'metalnessMap', 'roughnessMap', 'transmissionMap', 'emissiveMap',
  'normalMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
  'sheenColorMap', 'sheenRoughnessMap', 'iridescenceMap',
  'iridescenceThicknessMap', 'specularColorMap', 'specularIntensityMap',
  'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'envMap', 'lightMap',
] as const;
function sanitizeSceneTextures(scene: THREE.Scene): number {
  let repaired = 0;
  const seen = new WeakSet<object>();
  const fix = (tex: unknown): void => {
    if (!tex || typeof tex !== 'object') return;
    const t = tex as { isTexture?: boolean; matrix?: unknown };
    if (!t.isTexture) return;
    if (seen.has(t)) return;
    seen.add(t);
    const mat = t.matrix as { elements?: ArrayLike<number> } | null | undefined;
    if (!mat || !Array.isArray((mat as { elements?: unknown }).elements)
        && !(mat as { elements?: unknown })?.elements) {
      (t as { matrix: THREE.Matrix3 }).matrix = new THREE.Matrix3();
      repaired++;
    }
  };
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const m = mat as unknown as Record<string, unknown>;
      for (const slot of TEXTURE_SLOTS) fix(m[slot]);
    }
  });
  // Scene-level environment & background are iterated separately by the tracer.
  fix(scene.environment);
  fix(scene.background);
  return repaired;
}

/**
 * Synchronous stand-in for `ParallelMeshBVHWorker` / `GenerateMeshBVHWorker`.
 * three-gpu-pathtracer 0.0.22+ requires a BVH worker before `generateAsync`
 * will run — otherwise it throws:
 *   'PathTracingSceneGenerator: "setBVHWorker" must be called before
 *    "generateAsync" can be called.'
 *
 * The upstream workers spin up Web Workers, which needs Vite's worker
 * bundling to be configured to resolve `./generateMeshBVH.worker.js`
 * relative to node_modules. For a single-shot photoreal render, running
 * BVH construction on the main thread is fine — it blocks the UI for
 * ~1s then samples render async on the GPU. This wrapper matches the
 * `.generate(geometry, options) => Promise<bvh>` contract the path
 * tracer expects.
 */
async function makeInlineBVHGenerator(): Promise<BVHGeneratorLike> {
  const { MeshBVH } = await import('three-mesh-bvh');
  return {
    generate: (geometry, options) =>
      Promise.resolve(new MeshBVH(geometry, options as ConstructorParameters<typeof MeshBVH>[1])),
  };
}

// ─── Presets ─────────────────────────────────────────────────────────────────

type Preset = 'draft' | 'preview' | 'final';
interface PresetConfig { samples: number; labelDefault: string; hintDefault: string; }
const PRESETS: Record<Preset, PresetConfig> = {
  draft:   { samples: 1,   labelDefault: 'Draft',   hintDefault: 'Fast preview, noisy — good for composition checks.' },
  preview: { samples: 16,  labelDefault: 'Preview', hintDefault: 'Balanced quality and speed — usable for review.' },
  final:   { samples: 256, labelDefault: 'Final',   hintDefault: 'Clean render suitable for a client deliverable.' },
};

type ResPreset = '720p' | '1080p' | '2K' | '4K' | 'custom';
const RES_PRESETS: Record<Exclude<ResPreset, 'custom'>, { w: number; h: number }> = {
  '720p':  { w: 1280, h: 720 },
  '1080p': { w: 1920, h: 1080 },
  '2K':    { w: 2560, h: 1440 },
  '4K':    { w: 3840, h: 2160 },
};

// ─── Props ───────────────────────────────────────────────────────────────────

type Status = 'idle' | 'building' | 'rendering' | 'done' | 'error' | 'unavailable';

export function RenderingPanel(): React.ReactElement {
  const { t } = useTranslation('panels');
  const addRendering = useDocumentStore((s) => s.addRendering);
  const sun = useSceneStore((s) => s.sun);
  const setSun = useSceneStore((s) => s.setSun);

  const [preset, setPreset] = useState<Preset>('preview');
  const [resPreset, setResPreset] = useState<ResPreset>('1080p');
  const [customW, setCustomW] = useState(1920);
  const [customH, setCustomH] = useState(1080);
  const [envPreset, setEnvPreset] = useState<EnvPresetId>('studio');

  const [latitude, setLatitude] = useState(40.7);
  const [longitude, setLongitude] = useState(-74.0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('12:00');

  // Push sun into sceneStore so the live DirectionalLight + path-tracer follow.
  useEffect(() => {
    const month = parseInt(date.split('-')[1] ?? '6', 10);
    const [hh = '12', mm = '0'] = time.split(':');
    const hour = parseInt(hh, 10) + parseInt(mm, 10) / 60;
    const pos = calculateSolarPosition({ latitude, longitude, month, hour });
    setSun({ elevationDeg: pos.elevation, azimuthDeg: pos.azimuth });
  }, [latitude, longitude, date, time, setSun]);

  const [running, setRunning] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [resultPng, setResultPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const [savedViewId, setSavedViewId] = useState<string | null>(null);

  const cancelRef = useRef(false);

  const { width, height } = useMemo(() => {
    if (resPreset === 'custom') return { width: customW, height: customH };
    return { width: RES_PRESETS[resPreset].w, height: RES_PRESETS[resPreset].h };
  }, [resPreset, customW, customH]);

  const sunLabel = `${sun.elevationDeg.toFixed(0)}° el · ${sun.azimuthDeg.toFixed(0)}° az`;

  const start = useCallback(async () => {
    const live = getLiveScene();
    if (!live) {
      setStatus('unavailable');
      setError(t('rendering.noViewport', { defaultValue: '3D viewport not active.' }));
      return;
    }
    const { scene, camera: liveCamera } = live;
    const targetSamples = PRESETS[preset].samples;

    // Clone the live camera so we can set the correct aspect ratio for the
    // render output without mutating (and re-triggering) the live viewport.
    // Without this the projection matrix still matches the viewport aspect
    // but the renderer is sized width×height, so the image is stretched.
    const camera = liveCamera.clone() as THREE.PerspectiveCamera;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    setRunning(true);
    setStatus('building');
    setSampleCount(0);
    setResultPng(null);
    setError(null);
    setFallbackWarning(null);
    setSavedViewId(null);
    cancelRef.current = false;

    let renderer: THREE.WebGLRenderer;
    let offscreen: THREE.WebGLRenderer | null = null;
    let restoreSize: { w: number; h: number; pr: number } | null = null;
    if (live.renderer instanceof THREE.WebGLRenderer) {
      renderer = live.renderer;
      restoreSize = {
        w: renderer.domElement.width,
        h: renderer.domElement.height,
        pr: renderer.getPixelRatio(),
      };
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      offscreen = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      offscreen.setPixelRatio(1);
      offscreen.setSize(width, height, false);
      offscreen.outputColorSpace = THREE.SRGBColorSpace;
      offscreen.toneMapping = THREE.ACESFilmicToneMapping;
      renderer = offscreen;
      setFallbackWarning(t('rendering.webgpuFallback', {
        defaultValue: 'Live view is WebGPU — rendering via an offscreen WebGL context.',
      }));
    }

    const prevEnv = scene.environment;
    const prevBg = scene.background;

    let tracer: InstanceType<WebGLPathTracerCtor> | null = null;
    let rafId = 0;

    // Cleanup that runs whether the render finished, cancelled, or errored.
    // Previously these steps lived in a returned closure that the onClick
    // caller discarded, so `running` stayed true forever and the Render /
    // Render-again button remained disabled after the first run.
    //
    // Every step is wrapped in try/catch and the idempotent flag below
    // guards against double-invocation (e.g. loop completion triggering
    // cleanup() via both its finally block and an overlapping
    // cancellation path). three-gpu-pathtracer's WebGLPathTracer.dispose
    // unconditionally dereferences this._renderQuad.dispose — calling
    // dispose twice on the same tracer instance throws deep in the
    // library with a cryptic "reading 'dispose'" error.
    let cleanedUp = false;
    const cleanup = (): void => {
      if (cleanedUp) return;
      cleanedUp = true;
      try { cancelAnimationFrame(rafId); } catch { /* ignore */ }
      try { tracer?.dispose(); } catch { /* tracer internal mid-dispose */ }
      tracer = null;
      try {
        scene.environment = prevEnv;
        scene.background = prevBg;
      } catch { /* ignore */ }
      if (restoreSize && live.renderer instanceof THREE.WebGLRenderer) {
        try {
          live.renderer.setPixelRatio(restoreSize.pr);
          live.renderer.setSize(restoreSize.w, restoreSize.h, false);
        } catch { /* ignore */ }
      }
      try { offscreen?.dispose(); } catch { /* ignore */ }
      setRunning(false);
    };

    try {
      // Count meshes for a clear empty-scene message.
      let meshCount = 0;
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry) meshCount++;
      });
      if (meshCount === 0) {
        throw new Error(
          'Photoreal render needs at least one solid element in view — the current scene has no meshes the path-tracer can trace. Switch to 3D view and draw a wall / slab / column first.',
        );
      }

      // Apply env to the live scene — both the live view and the tracer
      // use the same scene from here on; no parallel clone to keep in sync.
      const env = await buildEnvPreset(envPreset, renderer, sun);
      scene.environment = env.envMap;
      if (env.background) scene.background = env.background;

      // Fix any texture with a missing/broken .matrix so the pathtracer's
      // MaterialsTexture can safely read texture.matrix.elements[0..8].
      const repaired = sanitizeSceneTextures(scene);
      if (repaired > 0) {
        // eslint-disable-next-line no-console
        console.info(`[photoreal] repaired ${repaired} texture matrices before render`);
      }

      // Warm the renderer so programs/uniforms exist before the path-tracer
      // snapshots them. Important on the WebGPU-fallback path where the
      // offscreen WebGL context has never drawn this scene.
      try { renderer.render(scene, camera); } catch { /* non-fatal */ }

      const PathTracer = await loadPathTracer();
      tracer = new PathTracer(renderer);
      tracer.bounces = preset === 'draft' ? 2 : preset === 'preview' ? 5 : 8;
      tracer.renderScale = preset === 'draft' ? 0.5 : 1.0;
      tracer.renderToCanvas = true;

      // Required since three-gpu-pathtracer 0.0.22+ — must be set before
      // setSceneAsync triggers generateAsync or the scene generator throws.
      tracer.setBVHWorker(await makeInlineBVHGenerator());

      try {
        await tracer.setSceneAsync(scene, camera);
      } catch (sceneErr) {
        // Log the full library-internal stack — Chrome collapses async
        // stacks by default so err.stack is the only way to see the
        // throw site in three-gpu-pathtracer from the console.
        // eslint-disable-next-line no-console
        console.error('[photoreal] setSceneAsync failed', (sceneErr as Error)?.stack ?? sceneErr);
        throw new Error(
          `Path-tracer failed to build scene (${meshCount} meshes): ${sceneErr instanceof Error ? sceneErr.message : String(sceneErr)}`,
        );
      }
      if (cancelRef.current) return;
      setStatus('rendering');

      const loop = (): void => {
        if (cancelRef.current || !tracer) { cleanup(); return; }
        if (tracer.samples >= targetSamples) {
          try {
            const canvas = renderer.domElement;
            const png = canvas.toDataURL('image/png');
            setResultPng(png);
            setStatus('done');
            // Don't auto-persist. Previously every render silently added a
            // "Render 4/22/2026, …" entry to the Navigator Views list,
            // which piled up on iteration. The user now opts in via the
            // explicit "Save to Views" button below.
          } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Failed to encode PNG');
          } finally {
            // Always release the renderer + `running` flag so the Render
            // button becomes clickable again for Render-again / cancel.
            cleanup();
          }
          return;
        }
        tracer.renderSample();
        setSampleCount(tracer.samples);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
      cleanup();
    }
  }, [preset, width, height, envPreset, sun, addRendering, t]);

  const download = useCallback((): void => {
    if (!resultPng) return;
    const a = document.createElement('a');
    a.href = resultPng;
    a.download = `opencad-render-${Date.now()}.png`;
    a.click();
  }, [resultPng]);

  const pct = Math.round((sampleCount / PRESETS[preset].samples) * 100);
  const elAzReadoutLabel = t('rendering.elAzReadout', {
    defaultValue: '{{el}} / {{az}}',
    el: t('shadow.elevation', { defaultValue: 'Elevation' }),
    az: t('shadow.azimuth', { defaultValue: 'Azimuth' }),
  });

  return (
    <div className="rendering-panel">
      <div className="panel-header">
        <span className="panel-title">
          {t('rendering.photorealTitle', { defaultValue: 'Photoreal render' })}
        </span>
      </div>

      {/* Render Quality */}
      <div className="analysis-section">
        <h4>{t('rendering.renderQuality', { defaultValue: 'Render Quality' })}</h4>
        <div className="field-row">
          <label htmlFor="render-preset">{t('rendering.preset', { defaultValue: 'Preset' })}</label>
          <select
            id="render-preset"
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
            disabled={running}
          >
            {(Object.entries(PRESETS) as [Preset, PresetConfig][]).map(([key, cfg]) => (
              <option key={key} value={key}>
                {t(`rendering.presets.${key}.label`, { defaultValue: cfg.labelDefault })}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <span className="field-label">{t('rendering.samples', { defaultValue: 'Samples' })}</span>
          <span className="field-value">{PRESETS[preset].samples} spp</span>
        </div>
      </div>

      {/* Resolution */}
      <div className="analysis-section">
        <h4>{t('rendering.resolution', { defaultValue: 'Resolution' })}</h4>
        <div className="field-row">
          <label htmlFor="render-res">{t('rendering.size', { defaultValue: 'Size' })}</label>
          <select
            id="render-res"
            value={resPreset}
            onChange={(e) => setResPreset(e.target.value as ResPreset)}
            disabled={running}
          >
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="2K">2K</option>
            <option value="4K">4K</option>
            <option value="custom">{t('rendering.custom', { defaultValue: 'Custom' })}</option>
          </select>
        </div>
        {resPreset === 'custom' && (
          <>
            <div className="field-row">
              <label htmlFor="render-custom-w">
                {t('rendering.widthPx', { defaultValue: 'Width (px)' })}
              </label>
              <input
                id="render-custom-w"
                type="number"
                min={128}
                max={8192}
                step={1}
                value={customW}
                onChange={(e) => setCustomW(Math.max(128, Math.min(8192, parseInt(e.target.value, 10) || 0)))}
                disabled={running}
              />
            </div>
            <div className="field-row">
              <label htmlFor="render-custom-h">
                {t('rendering.heightPx', { defaultValue: 'Height (px)' })}
              </label>
              <input
                id="render-custom-h"
                type="number"
                min={128}
                max={8192}
                step={1}
                value={customH}
                onChange={(e) => setCustomH(Math.max(128, Math.min(8192, parseInt(e.target.value, 10) || 0)))}
                disabled={running}
              />
            </div>
          </>
        )}
        <div className="field-row">
          <span className="field-label">{t('rendering.output', { defaultValue: 'Output' })}</span>
          <span className="field-value">{width} × {height}</span>
        </div>
      </div>

      {/* Environment */}
      <div className="analysis-section">
        <h4>{t('rendering.environment', { defaultValue: 'Environment' })}</h4>
        <div className="field-row">
          <label htmlFor="render-env">{t('rendering.map', { defaultValue: 'Map' })}</label>
          <select
            id="render-env"
            value={envPreset}
            onChange={(e) => setEnvPreset(e.target.value as EnvPresetId)}
            disabled={running}
          >
            {ENV_PRESET_ORDER.map((id) => (
              <option key={id} value={id}>
                {t(`rendering.envPresets.${id}`, { defaultValue: ENV_PRESET_LABELS[id] })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sun Position */}
      <div className="analysis-section">
        <h4>{t('shadow.sunPosition', { defaultValue: 'Sun Position' })}</h4>
        <div className="field-row">
          <label htmlFor="render-lat">{t('shadow.latitude', { defaultValue: 'Latitude' })}</label>
          <input
            id="render-lat"
            type="number"
            step={0.01}
            value={latitude}
            onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
            disabled={running}
          />
        </div>
        <div className="field-row">
          <label htmlFor="render-lng">{t('shadow.longitude', { defaultValue: 'Longitude' })}</label>
          <input
            id="render-lng"
            type="number"
            step={0.01}
            value={longitude}
            onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
            disabled={running}
          />
        </div>
        <div className="field-row">
          <label htmlFor="render-date">{t('shadow.date', { defaultValue: 'Date' })}</label>
          <input
            id="render-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={running}
          />
        </div>
        <div className="field-row">
          <label htmlFor="render-time">{t('shadow.time', { defaultValue: 'Time' })}</label>
          <input
            id="render-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={running}
          />
        </div>
        <div className="field-row">
          <span className="field-label">{elAzReadoutLabel}</span>
          <span className="field-value">{sunLabel}</span>
        </div>
      </div>

      {/* Status */}
      {fallbackWarning && (
        <div className="analysis-section">
          <div className="rendering-warning" role="status">{fallbackWarning}</div>
        </div>
      )}
      {status === 'rendering' && (
        <div className="analysis-section">
          <div className="rendering-progress">
            <div
              className="rendering-progress-bar"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="rendering-progress-label">
            {t('rendering.sampleProgress', {
              count: sampleCount,
              total: PRESETS[preset].samples,
              width,
              height,
              defaultValue: 'Sample {{count}} / {{total}} · {{width}}×{{height}}',
            })}
          </div>
        </div>
      )}
      {status === 'building' && (
        <div className="analysis-section">
          <div className="rendering-progress-label">
            {t('rendering.buildingEnv', { defaultValue: 'Building BVH + environment…' })}
          </div>
        </div>
      )}
      {error && (
        <div className="analysis-section">
          <div className="rendering-error" role="alert">{error}</div>
        </div>
      )}

      {/* Action */}
      {status !== 'done' ? (
        <button
          type="button"
          className="btn-run-analysis"
          onClick={() => { void start(); }}
          disabled={running || status === 'rendering' || status === 'building'}
        >
          {running
            ? t('rendering.rendering', { defaultValue: 'Rendering…' })
            : t('rendering.render', { defaultValue: 'Render' })}
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn-run-analysis"
            onClick={download}
          >
            <Download size={14} />
            {t('rendering.downloadPng', { defaultValue: 'Download PNG' })}
          </button>
          <button
            type="button"
            className="btn-run-analysis btn-run-analysis--secondary"
            disabled={!resultPng || savedViewId !== null}
            onClick={() => {
              if (!resultPng) return;
              const id = addRendering({
                name: `${t('rendering.renderName', { defaultValue: 'Render' })} ${new Date().toLocaleString()}`,
                png: resultPng,
                width,
                height,
                samples: PRESETS[preset].samples,
                envPreset,
              });
              if (id) setSavedViewId(id);
            }}
          >
            {savedViewId
              ? t('rendering.savedToViews', { defaultValue: 'Saved to Views ✓' })
              : t('rendering.saveToViews', { defaultValue: 'Save to Views' })}
          </button>
          <button
            type="button"
            className="btn-run-analysis btn-run-analysis--secondary"
            onClick={() => {
              setStatus('idle');
              setResultPng(null);
              setSampleCount(0);
              setSavedViewId(null);
              void start();
            }}
            disabled={running}
          >
            {t('rendering.renderAgain', { defaultValue: 'Render again' })}
          </button>
        </>
      )}

      {resultPng && (
        <img
          className="rendering-preview"
          src={resultPng}
          alt={t('rendering.previewAlt', { defaultValue: 'Photoreal render preview' })}
        />
      )}
    </div>
  );
}
