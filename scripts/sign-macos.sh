#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sign-macos.sh
#
# Drives `codesign` + `notarytool` against the Tauri macOS bundle. Can be
# invoked directly from CI or from an Xcode Run-Script build phase — Xcode
# drives the same codesign binary under the hood, so both paths produce
# identical signed output.
#
# Required environment (all must be set for a real release):
#   APPLE_SIGNING_IDENTITY   e.g. "Developer ID Application: Your Team (ABCDE12345)"
#   APPLE_TEAM_ID            10-char team id
#   APPLE_NOTARY_PROFILE     keychain profile name previously stored with
#                            `xcrun notarytool store-credentials`
#
# Optional:
#   APP_BUNDLE               override the default .app path
#   SKIP_NOTARIZATION=1      sign but don't submit to Apple (local dev)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEFAULT_APP="packages/desktop/src-tauri/target/release/bundle/macos/OpenCAD.app"
APP_BUNDLE="${APP_BUNDLE:-$DEFAULT_APP}"
ENTITLEMENTS="packages/desktop/src-tauri/entitlements.plist"
DMG_DIR="packages/desktop/src-tauri/target/release/bundle/dmg"

if [[ ! -d "$APP_BUNDLE" ]]; then
  echo "error: app bundle not found at $APP_BUNDLE"
  echo "hint: run 'pnpm build:desktop' first"
  exit 1
fi

if [[ -z "${APPLE_SIGNING_IDENTITY:-}" ]]; then
  echo "error: APPLE_SIGNING_IDENTITY is not set"
  echo "hint: export 'Developer ID Application: Your Team (ABCDE12345)'"
  exit 1
fi

echo "→ codesign: $APP_BUNDLE"
codesign \
  --force \
  --options=runtime \
  --timestamp \
  --deep \
  --entitlements "$ENTITLEMENTS" \
  --sign "$APPLE_SIGNING_IDENTITY" \
  "$APP_BUNDLE"

echo "→ verifying signature"
codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"
spctl --assess --type execute --verbose "$APP_BUNDLE" || true

if [[ "${SKIP_NOTARIZATION:-}" == "1" ]]; then
  echo "✓ signed (notarization skipped)"
  exit 0
fi

if [[ -z "${APPLE_NOTARY_PROFILE:-}" ]]; then
  echo "error: APPLE_NOTARY_PROFILE is not set"
  echo "hint: xcrun notarytool store-credentials <profile-name> --apple-id … --team-id …"
  exit 1
fi

ZIP_PATH="$(mktemp -d)/OpenCAD.zip"
echo "→ zipping for notarization: $ZIP_PATH"
ditto -c -k --keepParent "$APP_BUNDLE" "$ZIP_PATH"

echo "→ submitting to Apple notary service"
xcrun notarytool submit "$ZIP_PATH" \
  --keychain-profile "$APPLE_NOTARY_PROFILE" \
  --wait

echo "→ stapling ticket to bundle"
xcrun stapler staple "$APP_BUNDLE"
xcrun stapler validate "$APP_BUNDLE"

echo "✓ signed, notarized, and stapled: $APP_BUNDLE"

# ── DMG — optional second-stage. When a .dmg exists alongside the app, we
# rebuild it from the now-notarized app, sign the DMG itself, ship it to
# Apple for its own notarization pass, then staple the ticket back to the
# DMG. This is what lets users double-click the downloaded DMG without
# Gatekeeper throwing the "could not verify" dialog.
DMG_PATH=""
if [[ -d "$DMG_DIR" ]]; then
  DMG_PATH="$(/bin/ls "$DMG_DIR"/*.dmg 2>/dev/null | head -n1 || true)"
fi

if [[ -n "$DMG_PATH" && "${SKIP_DMG:-}" != "1" ]]; then
  echo ""
  echo "──────────────────────────────────────────────"
  echo "DMG stage"
  echo "──────────────────────────────────────────────"

  echo "→ rebuilding DMG from signed app"
  # Replace the app inside the DMG. Simplest path: produce a fresh DMG with
  # create-dmg (if available) or hdiutil. Fall back to hdiutil which is
  # present on every macOS install.
  NEW_DMG_TMP="$(mktemp -d)"
  NEW_DMG="$NEW_DMG_TMP/OpenCAD.dmg"
  STAGE="$NEW_DMG_TMP/stage"
  mkdir -p "$STAGE"
  /bin/cp -R "$APP_BUNDLE" "$STAGE/"
  /bin/ln -s /Applications "$STAGE/Applications"
  hdiutil create -volname "OpenCAD" \
    -srcfolder "$STAGE" \
    -ov -format UDZO \
    "$NEW_DMG" >/dev/null

  # Replace the original DMG with the freshly built one.
  /bin/mv "$NEW_DMG" "$DMG_PATH"
  rm -rf "$NEW_DMG_TMP"

  echo "→ codesign: $DMG_PATH"
  codesign \
    --force \
    --timestamp \
    --sign "$APPLE_SIGNING_IDENTITY" \
    "$DMG_PATH"

  codesign --verify --verbose=2 "$DMG_PATH"

  if [[ "${SKIP_NOTARIZATION:-}" == "1" ]]; then
    echo "✓ DMG signed (notarization skipped)"
  else
    echo "→ submitting DMG to notary service"
    xcrun notarytool submit "$DMG_PATH" \
      --keychain-profile "$APPLE_NOTARY_PROFILE" \
      --wait
    echo "→ stapling ticket to DMG"
    xcrun stapler staple "$DMG_PATH"
    xcrun stapler validate "$DMG_PATH"
    echo "✓ DMG signed, notarized, and stapled: $DMG_PATH"
  fi
fi
