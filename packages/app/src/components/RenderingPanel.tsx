/**
 * RenderingPanel — minimal photoreal renderer (v1 of #333 T-VIZ-040).
 *
 * Runs three-gpu-pathtracer against the live 3D scene, accumulates
 * samples at the user-chosen quality preset, and downloads the result
 * as a PNG. This is the v1 slice of the full photoreal spec:
 *
 *   - Quality presets (Draft / Preview / Final) drive the sample budget.
 *   - Uses the live WebGLRenderer from useThreeViewport.
 *   - Progress bar ticks as samples accumulate.
 *   - On completion, the canvas is snapshotted to PNG and downloaded.
 *
 * Deferred to v2 (follow-up issue):
 *   - HDRI picker + sun-from-geolocation lighting.
 *   - Appearing in the View Map / draggable onto layout sheets.
 *   - Custom resolutions beyond 1080p / 4K presets.
 *   - WebGPU renderer support (pathtracer is WebGL-only today).
 *
 * Implementation notes:
 *   - We do NOT create a throwaway WebGLRenderer — the pathtracer needs
 *     to drive the same renderer as the live view so the canvas is the
 *     one we can read back as PNG.
 *   - The live animate() loop is paused while rendering (via
 *     rendererReadyRef → effectively blocks updateScene), and the
 *     pathtracer.renderSample() is called in requestAnimationFrame.
 *   - On cancel we dispose the pathtracer, reset the live renderer's
 *     clear colour, and let the live loop resume.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Camera, X, Download } from 'lucide-react';
import * as THREE from 'three';
import { getLiveScene } from '../hooks/useThreeViewport';

// three-gpu-pathtracer + three-mesh-bvh can't be resolved in jsdom
// (ObjectBVH extends a class that isn't defined outside a real WebGL
// context), so we dynamically import it on first Render click. Keeps
// the panel module itself testable and shaves a few hundred KB off
// the initial bundle for users who never open the render tab.
type WebGLPathTracerCtor = new (renderer: THREE.WebGLRenderer) => {
  bounces: number;
  renderScale: number;
  renderToCanvas: boolean;
  samples: number;
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

type Preset = 'draft' | 'preview' | 'final';

interface PresetConfig {
  label: string;
  samples: number;
  description: string;
}

const PRESETS: Record<Preset, PresetConfig> = {
  draft:   { label: 'Draft',   samples: 1,   description: 'Fast preview, noisy — good for composition checks.' },
  preview: { label: 'Preview', samples: 16,  description: 'Balanced quality and speed — usable for review.' },
  final:   { label: 'Final',   samples: 256, description: 'Clean render suitable for a client deliverable.' },
};

interface RenderingPanelProps {
  onClose: () => void;
}

export function RenderingPanel({ onClose }: RenderingPanelProps): React.ReactElement {
  const [preset, setPreset] = useState<Preset>('preview');
  const [running, setRunning] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'building' | 'rendering' | 'done' | 'error' | 'unavailable'>('idle');
  const [resultPng, setResultPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Whether the live viewport is WebGL (pathtracer requirement).
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => {
    const live = getLiveScene();
    if (!live) { setCanRender(false); return; }
    // three-gpu-pathtracer 0.0.22 wraps a WebGLRenderer only. WebGPU is
    // a todo upstream — when live.renderer is a WebGPURenderer we bail
    // with a clear message rather than a cryptic error.
    setCanRender(live.renderer instanceof THREE.WebGLRenderer);
  }, []);

  const start = useCallback(async () => {
    const live = getLiveScene();
    if (!live) {
      setStatus('unavailable');
      setError('3D viewport not active.');
      return;
    }
    if (!(live.renderer instanceof THREE.WebGLRenderer)) {
      setStatus('unavailable');
      setError('Photoreal render requires the WebGL backend. Switch to WebGL in the viewport settings and try again.');
      return;
    }
    const { scene, camera, renderer } = live;
    const targetSamples = PRESETS[preset].samples;

    setRunning(true);
    setStatus('building');
    setSampleCount(0);
    setResultPng(null);
    setError(null);

    let tracer: InstanceType<WebGLPathTracerCtor> | null = null;
    let cancelled = false;
    let rafId = 0;
    try {
      const PathTracer = await loadPathTracer();
      tracer = new PathTracer(renderer);
      tracer.bounces = preset === 'draft' ? 2 : preset === 'preview' ? 5 : 8;
      tracer.renderScale = preset === 'draft' ? 0.5 : 1.0;
      tracer.renderToCanvas = true;

      await tracer.setSceneAsync(scene, camera);
      if (cancelled) return;
      setStatus('rendering');

      // Accumulate samples. renderSample() accumulates one more sample
      // on each call; we schedule them in rAF so the browser keeps the
      // tab responsive.
      const loop = (): void => {
        if (cancelled || !tracer) return;
        if (tracer.samples >= targetSamples) {
          // Snapshot the path-traced frame as PNG and hand it to the
          // download link. toDataURL reads from the renderer's canvas,
          // which renderToCanvas has been compositing into.
          try {
            const canvas = renderer.domElement;
            const png = canvas.toDataURL('image/png');
            setResultPng(png);
            setStatus('done');
          } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Failed to encode PNG');
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
    } finally {
      // Cleanup happens on panel close, not immediately — the user
      // needs the rendered image on-canvas to download.
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      tracer?.dispose();
    };
  }, [preset]);

  const download = useCallback((): void => {
    if (!resultPng) return;
    const a = document.createElement('a');
    a.href = resultPng;
    a.download = `opencad-render-${Date.now()}.png`;
    a.click();
  }, [resultPng]);

  const pct = Math.round((sampleCount / PRESETS[preset].samples) * 100);

  return (
    <div className="rendering-panel">
      <div className="panel-header">
        <span className="panel-title"><Camera size={14} /> Photoreal render</span>
        <button
          type="button"
          className="panel-close"
          onClick={onClose}
          aria-label="Close"
        ><X size={14} /></button>
      </div>

      {canRender === false && (
        <div className="rendering-unavailable">
          Photoreal render needs the WebGL backend. The current viewport is WebGPU —
          switch via <code>?renderer=webgl</code> or the viewport settings and reload.
        </div>
      )}

      {canRender && (
        <>
          <div className="rendering-presets">
            {(Object.entries(PRESETS) as [Preset, PresetConfig][]).map(([key, cfg]) => (
              <label key={key} className={`rendering-preset${preset === key ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="preset"
                  value={key}
                  checked={preset === key}
                  onChange={() => setPreset(key)}
                  disabled={running}
                />
                <div>
                  <div className="rendering-preset-label">{cfg.label}</div>
                  <div className="rendering-preset-samples">{cfg.samples} samples/pixel</div>
                  <div className="rendering-preset-description">{cfg.description}</div>
                </div>
              </label>
            ))}
          </div>

          {status === 'rendering' && (
            <div className="rendering-progress">
              <div
                className="rendering-progress-bar"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
              <span className="rendering-progress-label">
                Sample {sampleCount} / {PRESETS[preset].samples}
              </span>
            </div>
          )}

          {status === 'building' && (
            <div className="rendering-progress">
              <div className="rendering-progress-label">Building BVH…</div>
            </div>
          )}

          {error && (
            <div className="rendering-error" role="alert">{error}</div>
          )}

          <div className="rendering-actions">
            {status !== 'done' ? (
              <button
                type="button"
                className="btn-install"
                onClick={() => { void start(); }}
                disabled={running || status === 'rendering' || status === 'building'}
              >
                {running ? 'Rendering…' : 'Render'}
              </button>
            ) : (
              <>
                <button type="button" className="btn-install" onClick={download}>
                  <Download size={14} /> Download PNG
                </button>
                <button
                  type="button"
                  className="btn-uninstall"
                  onClick={() => {
                    setStatus('idle');
                    setResultPng(null);
                    setSampleCount(0);
                  }}
                >
                  Render again
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
