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
