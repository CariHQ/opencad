/**
 * CSS-based texture styles for material swatches.
 *
 * Returns a React.CSSProperties object that visually represents each material
 * using CSS gradients and SVG data URIs — no external image assets required.
 */

import type { CSSProperties } from 'react';
import type { Material } from '../lib/materials';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Shift each RGB channel by `amount` (positive = lighter, negative = darker). */
function adjustHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Encode an SVG string as a CSS url() data URI. */
function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.trim().replace(/\s+/g, ' '))}")`;
}

/** Running-bond brick pattern (20 × 12 px unit). */
function brickPattern(brickColor: string, mortarColor: string): CSSProperties {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="12">
    <rect width="20" height="12" fill="${mortarColor}"/>
    <rect x=".5" y=".5" width="19" height="5" rx="0" fill="${brickColor}"/>
    <rect x="-9.5" y="6.5" width="9" height="5" fill="${brickColor}"/>
    <rect x=".5" y="6.5" width="19" height="5" fill="${brickColor}"/>
    <rect x="20.5" y="6.5" width="9" height="5" fill="${brickColor}"/>
  </svg>`;
  return { backgroundImage: svgUrl(svg), backgroundSize: '20px 12px' };
}

/** Wood grain: repeated diagonal stripe set. */
function woodGrain(baseColor: string): CSSProperties {
  const dark = adjustHex(baseColor, -35);
  const med  = adjustHex(baseColor, -15);
  const lite = adjustHex(baseColor, +20);
  return {
    background: `repeating-linear-gradient(
      -12deg,
      ${baseColor} 0px, ${baseColor} 3px,
      ${dark}      3px, ${dark}      4px,
      ${baseColor} 4px, ${baseColor} 9px,
      ${med}       9px, ${med}      10px,
      ${baseColor}10px, ${baseColor}16px,
      ${lite}     16px, ${lite}     17px
    )`,
  };
}

/** Tile grid: transparent base + repeating grout lines. */
function tileGrid(baseColor: string, gridPx = 14, groutAlpha = 0.25): CSSProperties {
  const g = `rgba(0,0,0,${groutAlpha})`;
  const s = gridPx + 1; // pattern repeat = tile + 1px grout
  return {
    backgroundColor: baseColor,
    backgroundImage: [
      `repeating-linear-gradient(0deg,  transparent 0px, transparent ${gridPx}px, ${g} ${gridPx}px, ${g} ${s}px)`,
      `repeating-linear-gradient(90deg, transparent 0px, transparent ${gridPx}px, ${g} ${gridPx}px, ${g} ${s}px)`,
    ].join(', '),
    backgroundSize: `${s}px ${s}px`,
  };
}

/** Horizontal board / plank pattern. */
function boardPattern(baseColor: string, boardH = 10, gapDark = -30): CSSProperties {
  const dark = adjustHex(baseColor, gapDark);
  return {
    background: `repeating-linear-gradient(
      0deg,
      ${baseColor} 0px, ${baseColor} ${boardH}px,
      ${dark}      ${boardH}px, ${dark} ${boardH + 2}px
    )`,
  };
}

/** Horizontal metallic sheen gradient. */
function metallicSheen(baseColor: string, roughness: number): CSSProperties {
  const l1 = adjustHex(baseColor, +45);
  const l2 = adjustHex(baseColor, +20);
  const d1 = adjustHex(baseColor, -20);
  if (roughness < 0.35) {
    return {
      background: `linear-gradient(150deg,
        ${l1} 0%, ${l2} 22%, ${baseColor} 40%,
        ${d1} 52%, ${baseColor} 65%, ${l2} 82%, ${l1} 100%)`,
    };
  }
  return {
    background: `linear-gradient(150deg, ${l2} 0%, ${baseColor} 40%, ${d1} 60%, ${baseColor} 100%)`,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Returns a CSSProperties object that renders a material-representative
 * texture swatch. Spread it directly onto a `<div style={...}>`.
 */
import type { BIMMaterial } from '../lib/materials';

/** Texture style for BIM materials (structural/envelope/finish/mep categories). */
export function getBIMMaterialTextureStyle(mat: BIMMaterial): CSSProperties {
  const c = mat.color;
  // Map by id — BIM materials are a small, well-known set
  if (mat.id === 'bim-concrete')   return { background: [
    `radial-gradient(circle at 12% 28%, ${adjustHex(c, +15)} 0%, transparent 22%)`,
    `radial-gradient(circle at 68% 72%, ${adjustHex(c, -15)} 0%, transparent 20%)`,
    c,
  ].join(', ') };
  if (mat.id === 'bim-steel')      return metallicSheen(c, 0.4);
  if (mat.id === 'bim-timber')     return woodGrain(c);
  if (mat.id === 'bim-aluminum')   return metallicSheen(c, 0.25);
  if (mat.id === 'bim-brick')      return brickPattern(c, adjustHex(c, +50));
  if (mat.id === 'bim-glass')      return {
    background: `linear-gradient(135deg,
      rgba(255,255,255,0.85) 0%, ${c} 25%,
      rgba(255,255,255,0.4)  45%, ${c} 65%,
      rgba(255,255,255,0.2)  100%)`,
  };
  if (mat.id === 'bim-insulation') return {
    background: `repeating-linear-gradient(-25deg,
      ${c} 0px, ${c} 5px,
      ${adjustHex(c, +30)} 5px, ${adjustHex(c, +30)} 7px,
      ${c} 7px, ${c} 14px)`,
  };
  if (mat.id === 'bim-copper')     return metallicSheen(c, 0.3);
  return { backgroundColor: c };
}

export function getMaterialTextureStyle(mat: Material): CSSProperties {
  const c = mat.color;

  // ── Brick ─────────────────────────────────────────────────────────────────
  if (mat.id.startsWith('brick') || mat.id.includes('brick')) {
    return brickPattern(c, adjustHex(c, +50));
  }

  // ── Stone / masonry (non-brick) ───────────────────────────────────────────
  if (mat.category === 'Masonry') {
    const lite = adjustHex(c, +25);
    const dark = adjustHex(c, -20);
    return {
      background: [
        `radial-gradient(ellipse at 15% 25%, ${lite} 0%, transparent 40%)`,
        `radial-gradient(ellipse at 75% 65%, ${dark} 0%, transparent 35%)`,
        `radial-gradient(ellipse at 50% 85%, ${lite} 0%, transparent 25%)`,
        c,
      ].join(', '),
    };
  }

  // ── Timber / wood ─────────────────────────────────────────────────────────
  if (mat.category === 'Timber') {
    return woodGrain(c);
  }

  // ── Metal ─────────────────────────────────────────────────────────────────
  if (mat.category === 'Metal') {
    return metallicSheen(c, mat.roughness);
  }

  // ── Glass ─────────────────────────────────────────────────────────────────
  if (mat.category === 'Glass') {
    if (mat.roughness > 0.5) {
      // Frosted / diffuse
      return {
        background: `linear-gradient(135deg,
          rgba(255,255,255,0.55) 0%, ${c} 45%, rgba(255,255,255,0.25) 100%)`,
      };
    }
    return {
      background: `linear-gradient(135deg,
        rgba(255,255,255,0.85) 0%, ${c} 25%,
        rgba(255,255,255,0.4)  45%, ${c} 65%,
        rgba(255,255,255,0.2)  100%)`,
    };
  }

  // ── Concrete ──────────────────────────────────────────────────────────────
  if (mat.category === 'Concrete') {
    const lite = adjustHex(c, +15);
    const dark = adjustHex(c, -15);
    return {
      background: [
        `radial-gradient(circle at 12% 28%, ${lite} 0%, transparent 22%)`,
        `radial-gradient(circle at 68% 72%, ${dark} 0%, transparent 20%)`,
        `radial-gradient(circle at 42% 55%, ${lite} 0%, transparent 18%)`,
        `radial-gradient(circle at 85% 20%, ${dark} 0%, transparent 15%)`,
        c,
      ].join(', '),
    };
  }

  // ── Plaster / drywall ─────────────────────────────────────────────────────
  if (mat.category === 'Plaster') {
    const lite = adjustHex(c, +12);
    return {
      background: [
        `radial-gradient(ellipse at 30% 40%, ${lite} 0%, ${c} 70%)`,
        `radial-gradient(ellipse at 70% 70%, rgba(0,0,0,0.04) 0%, transparent 40%)`,
      ].join(', '),
    };
  }

  // ── Insulation ────────────────────────────────────────────────────────────
  if (mat.category === 'Insulation') {
    const lite = adjustHex(c, +30);
    return {
      background: `repeating-linear-gradient(
        -25deg,
        ${c}    0px, ${c}    5px,
        ${lite} 5px, ${lite} 7px,
        ${c}    7px, ${c}   14px
      )`,
    };
  }

  // ── Flooring ─────────────────────────────────────────────────────────────
  if (mat.category === 'Flooring') {
    if (mat.id.includes('carpet')) {
      const dark = adjustHex(c, -20);
      return {
        background: [
          `repeating-linear-gradient( 45deg, ${c} 0px, ${c} 3px, ${dark} 3px, ${dark} 4px)`,
          `repeating-linear-gradient(-45deg, ${c} 0px, ${c} 3px, ${dark} 3px, ${dark} 4px)`,
        ].join(', '),
      };
    }
    if (mat.id.includes('tile') || mat.id.includes('ceramic') || mat.id.includes('porcelain') || mat.id.includes('mosaic')) {
      return tileGrid(c);
    }
    if (mat.id.includes('wood') || mat.id.includes('laminate') || mat.id.includes('solid') || mat.id.includes('engineered')) {
      return woodGrain(c);
    }
    if (mat.roughness < 0.2) {
      // Polished / epoxy
      return { background: `linear-gradient(135deg, ${adjustHex(c, +40)} 0%, ${c} 50%, ${adjustHex(c, +40)} 100%)` };
    }
    return { backgroundColor: c };
  }

  // ── Roofing ───────────────────────────────────────────────────────────────
  if (mat.category === 'Roofing') {
    if (mat.id.includes('tile')) {
      const dark = adjustHex(c, -25);
      return {
        backgroundColor: c,
        backgroundImage: `repeating-linear-gradient(-45deg,
          transparent 0px, transparent 7px,
          ${dark} 7px, ${dark} 9px)`,
        backgroundSize: '12px 12px',
      };
    }
    if (mat.id.includes('metal') || mat.id.includes('seam')) {
      return boardPattern(c, 13, -15);
    }
    return { backgroundColor: c };
  }

  // ── Cladding ─────────────────────────────────────────────────────────────
  if (mat.category === 'Cladding') {
    if (mat.id.includes('timber')) return boardPattern(c, 10, -30);
    if (mat.id.includes('terracotta')) return brickPattern(c, adjustHex(c, -40));
    if (mat.id.includes('metal') || mat.id.includes('panel') || mat.id.includes('rainscreen')) {
      return boardPattern(c, 13, -15);
    }
    return { backgroundColor: c };
  }

  // ── Paint / finish ────────────────────────────────────────────────────────
  if (mat.category === 'Paint') {
    if (mat.roughness < 0.5) {
      return { background: `linear-gradient(130deg, ${adjustHex(c, +40)} 0%, ${c} 50%, ${c} 100%)` };
    }
    if (mat.id.includes('textured') || mat.id.includes('wallpaper')) {
      return {
        background: [
          `radial-gradient(circle at 30% 30%, rgba(0,0,0,0.04) 0%, transparent 30%)`,
          `radial-gradient(circle at 70% 70%, rgba(0,0,0,0.04) 0%, transparent 30%)`,
          c,
        ].join(', '),
      };
    }
    return { backgroundColor: c };
  }

  // ── Tile (specialty) ─────────────────────────────────────────────────────
  if (mat.category === 'Tile') {
    return tileGrid(c, 9, 0.2);
  }

  // ── Acoustic ─────────────────────────────────────────────────────────────
  if (mat.category === 'Acoustic') {
    if (mat.id.includes('foam')) {
      const dark = adjustHex(c, -20);
      return {
        background: [
          `repeating-linear-gradient( 45deg, ${c} 0px, ${c} 4px, ${dark} 4px, ${dark} 5px)`,
          `repeating-linear-gradient(-45deg, ${c} 0px, ${c} 4px, ${dark} 4px, ${dark} 5px)`,
        ].join(', '),
      };
    }
    return { backgroundColor: c };
  }

  // ── Waterproofing ─────────────────────────────────────────────────────────
  if (mat.category === 'Waterproofing') {
    return {
      background: `linear-gradient(160deg,
        ${adjustHex(c, +30)} 0%, ${c} 30%, ${c} 100%)`,
    };
  }

  return { backgroundColor: c };
}
