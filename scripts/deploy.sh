#!/usr/bin/env bash
# deploy.sh — deploy OpenCAD to production
#
# Prerequisites:
#   gcloud auth login
#   stripe login  (refreshed every 90 days)
#   pnpm install
#
# Usage:
#   ./scripts/deploy.sh [--skip-server] [--skip-frontend]

set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-opencad-prod}"
CLOUD_RUN_REGION="${CLOUD_RUN_REGION:-us-central1}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
AR_IMAGE="us-central1-docker.pkg.dev/${GCP_PROJECT}/opencad/opencad-server:${IMAGE_TAG}"
SERVICE_NAME="opencad-server"

SKIP_SERVER=false
SKIP_FRONTEND=false
for arg in "$@"; do
  case $arg in
    --skip-server)   SKIP_SERVER=true ;;
    --skip-frontend) SKIP_FRONTEND=true ;;
  esac
done

echo "==> OpenCAD production deploy"
echo "    GCP project:  $GCP_PROJECT"
echo "    Region:       $CLOUD_RUN_REGION"
echo "    Image tag:    $IMAGE_TAG"
echo ""

# ── 1. Tests ──────────────────────────────────────────────────────────────────
echo "==> Running CI checks..."
pnpm ci:local

# ── 2. Build frontend ─────────────────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = false ]; then
  echo "==> Reading build secrets from Secret Manager..."
  VITE_FIREBASE_API_KEY=$(gcloud secrets versions access latest --secret=opencad-firebase-api-key --project="$GCP_PROJECT")
  VITE_FIREBASE_AUTH_DOMAIN=$(gcloud secrets versions access latest --secret=opencad-firebase-auth-domain --project="$GCP_PROJECT")
  VITE_FIREBASE_PROJECT_ID=$(gcloud secrets versions access latest --secret=opencad-firebase-project-id --project="$GCP_PROJECT")
  VITE_FIREBASE_STORAGE_BUCKET=$(gcloud secrets versions access latest --secret=opencad-firebase-storage-bucket --project="$GCP_PROJECT")
  VITE_FIREBASE_MESSAGING_SENDER_ID=$(gcloud secrets versions access latest --secret=opencad-firebase-messaging-sender-id --project="$GCP_PROJECT")
  VITE_FIREBASE_APP_ID=$(gcloud secrets versions access latest --secret=opencad-firebase-app-id --project="$GCP_PROJECT")
  VITE_STRIPE_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=opencad-stripe-publishable-key --project="$GCP_PROJECT")

  echo "==> Building frontend..."
  VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
  VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  VITE_STRIPE_PUBLISHABLE_KEY="$VITE_STRIPE_PUBLISHABLE_KEY" \
  pnpm --filter=@opencad/app build

  echo "==> Deploying frontend to GCS..."
  gcloud storage rsync -R --delete-unmatched-destination-objects \
    packages/app/dist/ gs://opencad-app/ --project="$GCP_PROJECT"

  # Cache headers
  gcloud storage objects update "gs://opencad-app/assets/**" \
    --cache-control="public, max-age=31536000, immutable" \
    --project="$GCP_PROJECT" 2>/dev/null || true
  gcloud storage objects update gs://opencad-app/index.html \
    --cache-control="no-cache, no-store, must-revalidate" \
    --project="$GCP_PROJECT" --quiet
  gcloud storage objects update gs://opencad-app/sw.js \
    --cache-control="no-cache, no-store, must-revalidate" \
    --project="$GCP_PROJECT" --quiet
  gcloud storage objects update gs://opencad-app/manifest.webmanifest \
    --cache-control="no-cache, no-store, must-revalidate" \
    --project="$GCP_PROJECT" --quiet 2>/dev/null || true

  echo "  Frontend live at: https://app.opencad.archi"

  # ── Landing pages ──────────────────────────────────────────────────────────
  # Each HTML is post-processed to replace the FIREBASE_CONFIG_INJECT marker
  # with the real public Firebase web config so the landing's sign-up /
  # sign-in forms can actually talk to Firebase. (Firebase web config is not
  # a secret — it's restricted by domain allow-list on the Firebase side.)
  echo "==> Preparing landing pages with Firebase config..."
  LANDING_TMP="$(mktemp -d)"
  cp -R packages/landing/. "$LANDING_TMP"

  FB_INJECT_SCRIPT="<script>
  window.FIREBASE_API_KEY            = '${VITE_FIREBASE_API_KEY}';
  window.FIREBASE_AUTH_DOMAIN        = '${VITE_FIREBASE_AUTH_DOMAIN}';
  window.FIREBASE_PROJECT_ID         = '${VITE_FIREBASE_PROJECT_ID}';
  window.FIREBASE_STORAGE_BUCKET     = '${VITE_FIREBASE_STORAGE_BUCKET}';
  window.FIREBASE_MESSAGING_SENDER_ID= '${VITE_FIREBASE_MESSAGING_SENDER_ID}';
  window.FIREBASE_APP_ID             = '${VITE_FIREBASE_APP_ID}';
</script>"
  # Replace the marker across every landing HTML (root + persona pages).
  while IFS= read -r -d '' f; do
    python3 -c "
import sys, pathlib
p = pathlib.Path(sys.argv[1])
s = p.read_text()
p.write_text(s.replace('<!-- FIREBASE_CONFIG_INJECT -->', sys.argv[2]))
" "$f" "$FB_INJECT_SCRIPT"
  done < <(find "$LANDING_TMP" -name '*.html' -print0)

  echo "==> Deploying landing to GCS..."
  for f in index.html pricing.html privacy.html terms.html download.html; do
    [ -f "$LANDING_TMP/$f" ] && \
      gcloud storage cp "$LANDING_TMP/$f" "gs://opencad-landing/$f" \
        --project="$GCP_PROJECT" --quiet 2>/dev/null || true
  done
  if [ -d "$LANDING_TMP/for" ]; then
    gcloud storage rsync -R "$LANDING_TMP/for" gs://opencad-landing/for \
      --project="$GCP_PROJECT"
  fi
  gcloud storage cp "$LANDING_TMP"/og*.png gs://opencad-landing/ \
    --project="$GCP_PROJECT" --quiet 2>/dev/null || true
  if [ -d "$LANDING_TMP/screenshots" ]; then
    gcloud storage rsync -R "$LANDING_TMP/screenshots" gs://opencad-landing/screenshots \
      --project="$GCP_PROJECT"
  fi

  # Cache headers — landing HTML is no-cache so deploys reflect instantly.
  gcloud storage objects update "gs://opencad-landing/*.html" \
    --cache-control="no-cache, no-store, must-revalidate" \
    --project="$GCP_PROJECT" --quiet 2>/dev/null || true
  gcloud storage objects update "gs://opencad-landing/for/**/*.html" \
    --cache-control="no-cache, no-store, must-revalidate" \
    --project="$GCP_PROJECT" --quiet 2>/dev/null || true

  rm -rf "$LANDING_TMP"
  echo "  Landing live at: https://opencad.archi"

  # ── CDN cache invalidation ─────────────────────────────────────────────────
  # Landing HTML is no-cache on the bucket but the Cloud CDN edge can still
  # hold an older copy; invalidate explicitly so the new bundle appears now.
  echo "==> Invalidating CDN cache..."
  gcloud compute url-maps invalidate-cdn-cache opencad-url-map \
    --path "/*" \
    --project="$GCP_PROJECT" \
    --async \
    --quiet 2>/dev/null || echo "  (cache invalidate skipped — url-map may differ locally)"
fi

# ── 3. Build & push Docker image ──────────────────────────────────────────────
if [ "$SKIP_SERVER" = false ]; then
  echo "==> Building server Docker image..."
  gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
  docker build \
    --platform linux/amd64 \
    -f server/Dockerfile \
    -t "$AR_IMAGE" \
    server/
  docker push "$AR_IMAGE"
  echo "  Pushed: $AR_IMAGE"

  # ── 4. Update Cloud Run image ──────────────────────────────────────────────
  echo "==> Updating Cloud Run service ($SERVICE_NAME)..."
  gcloud run services update "$SERVICE_NAME" \
    --project="$GCP_PROJECT" \
    --region="$CLOUD_RUN_REGION" \
    --image="$AR_IMAGE" \
    --quiet
  echo "  Server live at: https://app.opencad.archi/api/v1/health"
fi

echo ""
echo "==> Deploy complete!"
