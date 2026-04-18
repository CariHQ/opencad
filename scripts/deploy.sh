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
  gsutil -m rsync -r -d packages/app/dist/ gs://opencad-app/

  # Cache headers
  gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
    "gs://opencad-app/assets/**" 2>/dev/null || true
  gsutil -m setmeta -h "Cache-Control:no-cache, no-store, must-revalidate" \
    gs://opencad-app/index.html \
    gs://opencad-app/sw.js \
    gs://opencad-app/manifest.webmanifest 2>/dev/null || true

  echo "  Frontend live at: https://app.opencad.archi"
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
