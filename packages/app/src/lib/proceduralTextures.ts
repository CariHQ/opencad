/**
 * Procedural PBR texture generator for architectural materials.
 *
 * All textures are generated on the GPU-side using Canvas 2D API and converted
 * to THREE.CanvasTexture. They are lazily created on first access and cached
 * for the session lifetime. No external image assets required.
 *
 * Each material produces:
 *   • map          — diffuse/albedo colour texture  (256 × 256)
 *   • roughnessMap — greyscale roughness           (128 × 128)
 *
 * UV repeat is tuned per category so textures tile at an architectural scale.
 */

import * as THREE from 'three';
import type { Material } from './materials';

// ── Seeded PRNG (mulberry32) — deterministic per material id ─────────────────

function seed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

function mulberry32(s: number) {
  return function () {
    let t = s += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

const SIZE_D = 256; // diffuse map resolution
const SIZE_R = 128; // roughness map resolution

function makeCtx(size: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas.getContext('2d')!;
}

function toTex(ctx: CanvasRenderingContext2D, repeatU = 4, repeatV = 4): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatU, repeatV);
  tex.needsUpdate = true;
  return tex;
}

/** Parse a CSS hex colour to {r,g,b} in 0-255. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Clamp a value to [0, 255]. */
const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

// ── Roughness map generators ──────────────────────────────────────────────────

function solidRoughnessMap(roughness: number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_R);
  const v = clamp255(roughness * 255);
  ctx.fillStyle = `rgb(${v},${v},${v})`;
  ctx.fillRect(0, 0, SIZE_R, SIZE_R);
  return toTex(ctx, 4, 4);
}

function noisyRoughnessMap(baseRoughness: number, variance: number, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_R);
  const base = clamp255(baseRoughness * 255);
  const d = clamp255(variance * 255);
  const img = ctx.createImageData(SIZE_R, SIZE_R);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = clamp255(base + (rng() * 2 - 1) * d);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTex(ctx, 4, 4);
}

// ── Diffuse map generators ────────────────────────────────────────────────────

/** Concrete: grey noise with aggregate specks. */
function concreteDiffuse(baseColor: string, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  const img = ctx.createImageData(SIZE_D, SIZE_D);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rng() - 0.5) * 40;
    img.data[i]     = clamp255(r + n);
    img.data[i + 1] = clamp255(g + n);
    img.data[i + 2] = clamp255(b + n);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Aggregate specks
  for (let k = 0; k < 120; k++) {
    const x = rng() * SIZE_D;
    const y = rng() * SIZE_D;
    const radius = rng() * 3 + 1;
    const bright = rng() > 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = bright ? `rgba(220,215,200,0.4)` : `rgba(50,50,50,0.3)`;
    ctx.fill();
  }
  return toTex(ctx, 3, 3);
}

/** Brick: running-bond with colour variation between bricks. */
function brickDiffuse(baseColor: string, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  // mortar background
  ctx.fillStyle = `rgb(${clamp255(r + 50)},${clamp255(g + 40)},${clamp255(b + 30)})`;
  ctx.fillRect(0, 0, SIZE_D, SIZE_D);

  const brickW = 60, brickH = 26, mortarT = 4;
  const cols = Math.ceil(SIZE_D / brickW) + 1;
  const rows = Math.ceil(SIZE_D / (brickH + mortarT)) + 1;

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = 0; col < cols; col++) {
      const x = col * brickW - offset;
      const y = row * (brickH + mortarT);
      const dr = (rng() - 0.5) * 35;
      const dg = (rng() - 0.5) * 20;
      const db = (rng() - 0.5) * 15;
      ctx.fillStyle = `rgb(${clamp255(r + dr)},${clamp255(g + dg)},${clamp255(b + db)})`;
      ctx.fillRect(x + 1, y + 1, brickW - mortarT, brickH - 1);
      // subtle surface variation
      if (rng() > 0.6) {
        ctx.fillStyle = `rgba(0,0,0,0.07)`;
        ctx.fillRect(x + 1 + rng() * 20, y + 1, rng() * 20 + 5, brickH - 2);
      }
    }
  }
  return toTex(ctx, 4, 4);
}

/** Stone: mottled crystalline. */
function stoneDiffuse(baseColor: string, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  const img = ctx.createImageData(SIZE_D, SIZE_D);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rng() - 0.5) * 50;
    img.data[i]     = clamp255(r + n);
    img.data[i + 1] = clamp255(g + n);
    img.data[i + 2] = clamp255(b + n);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Veining / grain lines
  for (let k = 0; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo(rng() * SIZE_D, rng() * SIZE_D);
    ctx.bezierCurveTo(
      rng() * SIZE_D, rng() * SIZE_D,
      rng() * SIZE_D, rng() * SIZE_D,
      rng() * SIZE_D, rng() * SIZE_D,
    );
    ctx.strokeStyle = `rgba(${clamp255(r - 40)},${clamp255(g - 35)},${clamp255(b - 30)},0.25)`;
    ctx.lineWidth = rng() * 1.5 + 0.5;
    ctx.stroke();
  }
  return toTex(ctx, 3, 3);
}

/** Wood: sinusoidal grain with knot variations. */
function woodDiffuse(baseColor: string, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  const img = ctx.createImageData(SIZE_D, SIZE_D);
  const freq = 0.08 + rng() * 0.04;
  const amp  = 12 + rng() * 8;

  for (let y = 0; y < SIZE_D; y++) {
    for (let x = 0; x < SIZE_D; x++) {
      const grain = Math.sin((y + Math.sin(x * freq) * amp) * 0.25) * 0.5 + 0.5;
      const dk = grain * 55 - 28;
      const i = (y * SIZE_D + x) * 4;
      img.data[i]     = clamp255(r + dk * 1.1);
      img.data[i + 1] = clamp255(g + dk * 0.7);
      img.data[i + 2] = clamp255(b + dk * 0.3);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Knots
  for (let k = 0; k < 2; k++) {
    const cx = rng() * SIZE_D, cy = rng() * SIZE_D;
    for (let ring = 8; ring > 0; ring--) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring * 3, ring * 5, rng() * Math.PI, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${clamp255(r - 30)},${clamp255(g - 20)},${clamp255(b - 15)},0.4)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  return toTex(ctx, 5, 5);
}

/** Metal: brushed horizontal streaks. */
function metalDiffuse(baseColor: string, roughness: number, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  const img = ctx.createImageData(SIZE_D, SIZE_D);

  for (let y = 0; y < SIZE_D; y++) {
    const streak = Math.sin(y * 0.7 + rng() * 0.5) * (roughness < 0.4 ? 40 : 20);
    for (let x = 0; x < SIZE_D; x++) {
      const n = (rng() - 0.5) * (roughness < 0.35 ? 12 : 25);
      const i = (y * SIZE_D + x) * 4;
      img.data[i]     = clamp255(r + streak + n);
      img.data[i + 1] = clamp255(g + streak + n);
      img.data[i + 2] = clamp255(b + streak + n);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTex(ctx, 2, 2);
}

/** Glass: near-solid light-blue with faint reflective gradient. */
function glassDiffuse(baseColor: string, _rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  const grad = ctx.createLinearGradient(0, 0, SIZE_D, SIZE_D);
  grad.addColorStop(0, `rgba(255,255,255,0.6)`);
  grad.addColorStop(0.3, `rgba(${r},${g},${b},0.85)`);
  grad.addColorStop(0.6, `rgba(255,255,255,0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0.9)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE_D, SIZE_D);
  return toTex(ctx, 1, 1);
}

/** Tile: flat colour with grout grid lines. */
function tileDiffuse(baseColor: string, gridPx: number, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, SIZE_D, SIZE_D);
  // Per-tile colour variation
  const count = Math.floor(SIZE_D / gridPx);
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      const dr = (rng() - 0.5) * 20;
      ctx.fillStyle = `rgb(${clamp255(r + dr)},${clamp255(g + dr)},${clamp255(b + dr)})`;
      ctx.fillRect(col * gridPx + 1, row * gridPx + 1, gridPx - 2, gridPx - 2);
    }
  }
  // Grout lines
  ctx.strokeStyle = `rgb(${clamp255(r - 30)},${clamp255(g - 30)},${clamp255(b - 25)})`;
  ctx.lineWidth = 2;
  for (let i = 0; i <= SIZE_D; i += gridPx) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE_D); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE_D, i); ctx.stroke();
  }
  return toTex(ctx, 4, 4);
}

/** Plaster / drywall: smooth with subtle orange-peel. */
function plasterDiffuse(baseColor: string, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  const img = ctx.createImageData(SIZE_D, SIZE_D);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rng() - 0.5) * 14;
    img.data[i]     = clamp255(r + n);
    img.data[i + 1] = clamp255(g + n);
    img.data[i + 2] = clamp255(b + n);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTex(ctx, 6, 6);
}

/** Insulation: fluffy fibrous texture. */
function insulationDiffuse(baseColor: string, rng: () => number): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  const { r, g, b } = hexToRgb(baseColor);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, SIZE_D, SIZE_D);
  for (let k = 0; k < 300; k++) {
    const x0 = rng() * SIZE_D, y0 = rng() * SIZE_D;
    const len = rng() * 30 + 5, angle = rng() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(angle) * len, y0 + Math.sin(angle) * len);
    ctx.strokeStyle = `rgba(${clamp255(r + 40)},${clamp255(g + 35)},${clamp255(b + 20)},0.4)`;
    ctx.lineWidth = rng() * 1.5 + 0.5;
    ctx.stroke();
  }
  return toTex(ctx, 3, 3);
}

/** Generic solid colour fallback. */
function solidDiffuse(baseColor: string): THREE.CanvasTexture {
  const ctx = makeCtx(SIZE_D);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, SIZE_D, SIZE_D);
  return toTex(ctx, 4, 4);
}

// ── Cache ─────────────────────────────────────────────────────────────────────

export interface PBRMaps {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

const diffuseCache  = new Map<string, THREE.CanvasTexture>();
const roughCache    = new Map<string, THREE.CanvasTexture>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return (and cache) PBR texture maps for a material.
 * Safe to call synchronously — all generation is CPU/canvas, no network.
 */
export function getPBRMaps(mat: Material): PBRMaps {
  if (diffuseCache.has(mat.id)) {
    return {
      map:          diffuseCache.get(mat.id)!,
      roughnessMap: roughCache.get(mat.id)!,
    };
  }

  const rng = mulberry32(seed(mat.id));

  let map: THREE.CanvasTexture;
  let roughnessMap: THREE.CanvasTexture;

  const cat = mat.category;
  const id  = mat.id;

  // Diffuse map
  if (cat === 'Concrete')       map = concreteDiffuse(mat.color, rng);
  else if (id.includes('brick') || id.includes('Brick')) map = brickDiffuse(mat.color, rng);
  else if (cat === 'Masonry')   map = stoneDiffuse(mat.color, rng);
  else if (cat === 'Timber')    map = woodDiffuse(mat.color, rng);
  else if (cat === 'Metal')     map = metalDiffuse(mat.color, mat.roughness, rng);
  else if (cat === 'Glass')     map = glassDiffuse(mat.color, rng);
  else if (cat === 'Plaster')   map = plasterDiffuse(mat.color, rng);
  else if (cat === 'Insulation')map = insulationDiffuse(mat.color, rng);
  else if (cat === 'Flooring' && (id.includes('tile') || id.includes('ceramic') || id.includes('porcelain')))
                                map = tileDiffuse(mat.color, 32, rng);
  else if (cat === 'Flooring' && (id.includes('wood') || id.includes('laminate') || id.includes('solid') || id.includes('engineered')))
                                map = woodDiffuse(mat.color, rng);
  else if (cat === 'Tile')      map = tileDiffuse(mat.color, 24, rng);
  else if (cat === 'Cladding' && id.includes('timber')) map = woodDiffuse(mat.color, rng);
  else                          map = solidDiffuse(mat.color);

  // Roughness map — noisy for rough surfaces, smooth gradient for polished
  if (mat.roughness < 0.25) {
    roughnessMap = solidRoughnessMap(mat.roughness);
  } else {
    roughnessMap = noisyRoughnessMap(mat.roughness, 0.12, mulberry32(seed(mat.id + '_r')));
  }

  diffuseCache.set(mat.id, map);
  roughCache.set(mat.id, roughnessMap);

  return { map, roughnessMap };
}

/** Release all cached GPU textures (call on unmount / scene teardown). */
export function disposePBRCache(): void {
  diffuseCache.forEach((t) => t.dispose());
  roughCache.forEach((t) => t.dispose());
  diffuseCache.clear();
  roughCache.clear();
}
