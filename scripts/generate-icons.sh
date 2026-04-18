#!/usr/bin/env bash
# OpenCAD Icon Generator
# Requires: rsvg-convert, convert (ImageMagick), iconutil (macOS)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ICONS="$REPO_ROOT/packages/app/public/icons"
APP_PUBLIC="$REPO_ROOT/packages/app/public"
TAURI_ICONS="$REPO_ROOT/packages/desktop/src-tauri/icons"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo ">>> Creating output directories..."
mkdir -p "$APP_ICONS"
mkdir -p "$TAURI_ICONS"

# ─────────────────────────────────────────────────────────────
# 1. SVG SOURCE FILES
# ─────────────────────────────────────────────────────────────

echo ">>> Writing SVG sources..."

# Main icon SVG — dark background, blue compass mark
# Design: Circle with crosshair/orthographic projection lines
# + a stylised CAD cursor (drafting compass) in the center
# Legible from 16px to 512px
cat > "$TMP/icon.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Dark background with rounded corners -->
  <rect width="512" height="512" rx="96" fill="#0f172a"/>

  <!-- Outer ring: main accent circle -->
  <circle cx="256" cy="256" r="188" fill="none" stroke="#0d99ff" stroke-width="20"/>

  <!-- Cardinal axis tick marks (N/S/E/W) — short, evenly spaced -->
  <!-- Top tick -->
  <line x1="256" y1="52"  x2="256" y2="104" stroke="#0d99ff" stroke-width="18" stroke-linecap="round"/>
  <!-- Bottom tick -->
  <line x1="256" y1="408" x2="256" y2="460" stroke="#0d99ff" stroke-width="18" stroke-linecap="round"/>
  <!-- Left tick -->
  <line x1="52"  y1="256" x2="104" y2="256" stroke="#0d99ff" stroke-width="18" stroke-linecap="round"/>
  <!-- Right tick -->
  <line x1="408" y1="256" x2="460" y2="256" stroke="#0d99ff" stroke-width="18" stroke-linecap="round"/>

  <!-- Inner crosshair lines — thin, spanning ring interior -->
  <line x1="256" y1="112" x2="256" y2="400" stroke="#0d99ff" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
  <line x1="112" y1="256" x2="400" y2="256" stroke="#0d99ff" stroke-width="6" stroke-linecap="round" opacity="0.45"/>

  <!-- Diagonal guide lines (45°) — lighter -->
  <line x1="124" y1="124" x2="388" y2="388" stroke="#0d99ff" stroke-width="4" stroke-linecap="round" opacity="0.22"/>
  <line x1="388" y1="124" x2="124" y2="388" stroke="#0d99ff" stroke-width="4" stroke-linecap="round" opacity="0.22"/>

  <!-- Center: filled accent circle (cursor / center mark) -->
  <circle cx="256" cy="256" r="32" fill="#0d99ff"/>
  <!-- Center inner dot — white, gives depth -->
  <circle cx="256" cy="256" r="12" fill="#ffffff"/>
</svg>
SVGEOF

# Favicon SVG — same design, minimal for small sizes
# Uses simpler geometry that reads at 16px
cat > "$APP_PUBLIC/favicon.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- Background -->
  <rect width="32" height="32" rx="6" fill="#0f172a"/>
  <!-- Ring -->
  <circle cx="16" cy="16" r="11" fill="none" stroke="#0d99ff" stroke-width="2"/>
  <!-- Cross ticks -->
  <line x1="16" y1="3"  x2="16" y2="7"  stroke="#0d99ff" stroke-width="2" stroke-linecap="round"/>
  <line x1="16" y1="25" x2="16" y2="29" stroke="#0d99ff" stroke-width="2" stroke-linecap="round"/>
  <line x1="3"  y1="16" x2="7"  y2="16" stroke="#0d99ff" stroke-width="2" stroke-linecap="round"/>
  <line x1="25" y1="16" x2="29" y2="16" stroke="#0d99ff" stroke-width="2" stroke-linecap="round"/>
  <!-- Center dot -->
  <circle cx="16" cy="16" r="3" fill="#0d99ff"/>
</svg>
SVGEOF

# Maskable SVG — white mark on solid blue, padded for safe zone
cat > "$TMP/icon-maskable.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Solid blue fill (bleeds to edges for maskable) -->
  <rect width="512" height="512" fill="#0d99ff"/>

  <!-- White mark, contained within safe zone (inner 75% = 384px) -->
  <!-- Safe zone: 64px inset on each side → mark centered in 384x384 -->

  <!-- Outer ring -->
  <circle cx="256" cy="256" r="148" fill="none" stroke="white" stroke-width="18"/>

  <!-- Cardinal ticks -->
  <line x1="256" y1="92"  x2="256" y2="132" stroke="white" stroke-width="16" stroke-linecap="round"/>
  <line x1="256" y1="380" x2="256" y2="420" stroke="white" stroke-width="16" stroke-linecap="round"/>
  <line x1="92"  y1="256" x2="132" y2="256" stroke="white" stroke-width="16" stroke-linecap="round"/>
  <line x1="380" y1="256" x2="420" y2="256" stroke="white" stroke-width="16" stroke-linecap="round"/>

  <!-- Inner crosshair -->
  <line x1="256" y1="136" x2="256" y2="376" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
  <line x1="136" y1="256" x2="376" y2="256" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.5"/>

  <!-- Center fill circle -->
  <circle cx="256" cy="256" r="28" fill="white"/>
  <!-- Center accent dot -->
  <circle cx="256" cy="256" r="10" fill="#0d99ff"/>
</svg>
SVGEOF

# ─────────────────────────────────────────────────────────────
# 2. RASTERIZE PNG FILES
# ─────────────────────────────────────────────────────────────

echo ">>> Rasterizing PNG icons..."

rasterize() {
  local src="$1"
  local dest="$2"
  local size="$3"
  rsvg-convert -w "$size" -h "$size" "$src" -o "$dest"
  echo "    [ok] $dest (${size}x${size})"
}

# ── PWA / Browser icons ──────────────────────────────────────
rasterize "$TMP/icon.svg"          "$APP_ICONS/icon-16.png"             16
rasterize "$TMP/icon.svg"          "$APP_ICONS/icon-32.png"             32
rasterize "$TMP/icon.svg"          "$APP_ICONS/icon-192.png"            192
rasterize "$TMP/icon.svg"          "$APP_ICONS/icon-512.png"            512
rasterize "$TMP/icon-maskable.svg" "$APP_ICONS/icon-maskable-192.png"   192
rasterize "$TMP/icon-maskable.svg" "$APP_ICONS/icon-maskable-512.png"   512
rasterize "$TMP/icon-maskable.svg" "$APP_ICONS/apple-touch-icon.png"    180

# Legacy names (keep for backward compat with existing index.html reference)
cp "$APP_ICONS/icon-32.png" "$APP_ICONS/favicon-32.png"

# ── Tauri / Desktop icons ─────────────────────────────────────
rasterize "$TMP/icon.svg"          "$TAURI_ICONS/32x32.png"             32
rasterize "$TMP/icon.svg"          "$TAURI_ICONS/128x128.png"           128
rasterize "$TMP/icon.svg"          "$TAURI_ICONS/128x128@2x.png"        256
rasterize "$TMP/icon.svg"          "$TAURI_ICONS/icon.png"              512

# ─────────────────────────────────────────────────────────────
# 3. FAVICON.ICO (multi-size: 16 + 32)
# ─────────────────────────────────────────────────────────────

echo ">>> Building favicon.ico..."
rasterize "$TMP/icon.svg" "$TMP/ico-16.png" 16
rasterize "$TMP/icon.svg" "$TMP/ico-32.png" 32
convert "$TMP/ico-16.png" "$TMP/ico-32.png" \
  -define icon:auto-resize=32,16 \
  "$APP_PUBLIC/favicon.ico"
echo "    [ok] $APP_PUBLIC/favicon.ico"

# ─────────────────────────────────────────────────────────────
# 4. ICON.ICO FOR WINDOWS (multi-size: 16, 32, 48, 256)
# ─────────────────────────────────────────────────────────────

echo ">>> Building icon.ico (Windows)..."
rasterize "$TMP/icon.svg" "$TMP/win-16.png"  16
rasterize "$TMP/icon.svg" "$TMP/win-32.png"  32
rasterize "$TMP/icon.svg" "$TMP/win-48.png"  48
rasterize "$TMP/icon.svg" "$TMP/win-256.png" 256
convert "$TMP/win-16.png" "$TMP/win-32.png" "$TMP/win-48.png" "$TMP/win-256.png" \
  -define icon:auto-resize=256,48,32,16 \
  "$TAURI_ICONS/icon.ico"
echo "    [ok] $TAURI_ICONS/icon.ico"

# ─────────────────────────────────────────────────────────────
# 5. ICON.ICNS FOR MACOS
# ─────────────────────────────────────────────────────────────

echo ">>> Building icon.icns (macOS)..."
ICONSET="$TMP/AppIcon.iconset"
mkdir -p "$ICONSET"

rasterize "$TMP/icon.svg" "$ICONSET/icon_16x16.png"       16
rasterize "$TMP/icon.svg" "$ICONSET/icon_16x16@2x.png"    32
rasterize "$TMP/icon.svg" "$ICONSET/icon_32x32.png"       32
rasterize "$TMP/icon.svg" "$ICONSET/icon_32x32@2x.png"    64
rasterize "$TMP/icon.svg" "$ICONSET/icon_64x64.png"       64
rasterize "$TMP/icon.svg" "$ICONSET/icon_64x64@2x.png"    128
rasterize "$TMP/icon.svg" "$ICONSET/icon_128x128.png"     128
rasterize "$TMP/icon.svg" "$ICONSET/icon_128x128@2x.png"  256
rasterize "$TMP/icon.svg" "$ICONSET/icon_256x256.png"     256
rasterize "$TMP/icon.svg" "$ICONSET/icon_256x256@2x.png"  512
rasterize "$TMP/icon.svg" "$ICONSET/icon_512x512.png"     512
rasterize "$TMP/icon.svg" "$ICONSET/icon_512x512@2x.png"  1024

iconutil --convert icns --output "$TAURI_ICONS/icon.icns" "$ICONSET"
echo "    [ok] $TAURI_ICONS/icon.icns"

# ─────────────────────────────────────────────────────────────
# 6. VERIFY
# ─────────────────────────────────────────────────────────────

echo ""
echo ">>> Verification:"
echo ""
echo "  PWA / Browser:"
identify "$APP_ICONS"/*.png 2>/dev/null | awk '{print "    "$1" "$3}'
echo ""
echo "  Tauri / Desktop:"
identify "$TAURI_ICONS"/*.png 2>/dev/null | awk '{print "    "$1" "$3}'
echo ""
echo "  favicon.ico:"
file "$APP_PUBLIC/favicon.ico"
echo "  favicon.svg:"
file "$APP_PUBLIC/favicon.svg"
echo "  icon.icns:"
file "$TAURI_ICONS/icon.icns"
echo "  icon.ico:"
file "$TAURI_ICONS/icon.ico"

echo ""
echo ">>> Done."
