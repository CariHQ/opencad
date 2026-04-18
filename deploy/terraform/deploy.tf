# ── Static asset deployment ───────────────────────────────────────────────────
# Deploys the landing page and React app to their GCS buckets.
# Triggered when app_version changes (pass the git SHA: -var="app_version=$(git rev-parse HEAD)").

locals {
  # Flat list of landing page HTML files to upload
  landing_files = {
    "index.html"   = "${var.landing_dir}/index.html"
    "privacy.html" = "${var.landing_dir}/privacy.html"
    "terms.html"   = "${var.landing_dir}/terms.html"
  }
}

# Landing page files — uploaded individually so Cache-Control can be set.
resource "null_resource" "deploy_landing" {
  triggers = {
    version      = var.app_version
    landing_hash = sha256(join(",", [for f in values(local.landing_files) : fileexists(f) ? filemd5(f) : "missing"]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      BUCKET="${google_storage_bucket.landing.name}"
      PROJECT="${var.project}"

      # Read Firebase config from Secret Manager and build injection script tag
      FIREBASE_API_KEY=$(gcloud secrets versions access latest --secret=opencad-firebase-api-key --project=$PROJECT 2>/dev/null || echo "")
      FIREBASE_AUTH_DOMAIN=$(gcloud secrets versions access latest --secret=opencad-firebase-auth-domain --project=$PROJECT 2>/dev/null || echo "")
      FIREBASE_PROJECT_ID=$(gcloud secrets versions access latest --secret=opencad-firebase-project-id --project=$PROJECT 2>/dev/null || echo "")
      FIREBASE_STORAGE_BUCKET=$(gcloud secrets versions access latest --secret=opencad-firebase-storage-bucket --project=$PROJECT 2>/dev/null || echo "")
      FIREBASE_MESSAGING_SENDER_ID=$(gcloud secrets versions access latest --secret=opencad-firebase-messaging-sender-id --project=$PROJECT 2>/dev/null || echo "")
      FIREBASE_APP_ID=$(gcloud secrets versions access latest --secret=opencad-firebase-app-id --project=$PROJECT 2>/dev/null || echo "")

      FIREBASE_SCRIPT="<script>window.FIREBASE_API_KEY='$FIREBASE_API_KEY';window.FIREBASE_AUTH_DOMAIN='$FIREBASE_AUTH_DOMAIN';window.FIREBASE_PROJECT_ID='$FIREBASE_PROJECT_ID';window.FIREBASE_STORAGE_BUCKET='$FIREBASE_STORAGE_BUCKET';window.FIREBASE_MESSAGING_SENDER_ID='$FIREBASE_MESSAGING_SENDER_ID';window.FIREBASE_APP_ID='$FIREBASE_APP_ID';<\/script>"

      # Inject Firebase config into index.html and upload
      tmpfile=$(mktemp /tmp/index.XXXXXX.html)
      sed "s|<!-- FIREBASE_CONFIG_INJECT -->|$FIREBASE_SCRIPT|" "${var.landing_dir}/index.html" > "$tmpfile"
      gcloud storage cp "$tmpfile" "gs://$BUCKET/index.html" \
        --cache-control="no-cache, no-store" \
        --content-type="text/html; charset=utf-8"
      rm "$tmpfile"

      # Upload remaining HTML pages as-is
      for file in privacy.html terms.html; do
        src="${var.landing_dir}/$file"
        if [ -f "$src" ]; then
          gcloud storage cp "$src" "gs://$BUCKET/$file" \
            --cache-control="no-cache, no-store" \
            --content-type="text/html; charset=utf-8"
        fi
      done

      # Upload screenshots if they exist
      if ls ${var.landing_dir}/screenshots/*.png 2>/dev/null | head -1 | grep -q .; then
        gcloud storage cp "${var.landing_dir}/screenshots/*.png" "gs://$BUCKET/screenshots/" \
          --cache-control="public, max-age=604800"
      fi
    EOT
  }

  depends_on = [google_storage_bucket.landing]
}

# React app — rsync the built dist directory.
resource "null_resource" "deploy_app" {
  triggers = {
    version = var.app_version
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      BUCKET="${google_storage_bucket.app.name}"
      DIST="${var.app_dist_path}"

      if [ ! -d "$DIST" ]; then
        echo "ERROR: dist directory not found at $DIST — run 'pnpm build:browser' first"
        exit 1
      fi

      # Sync all files; assets/ gets a long max-age, index.html gets no-cache.
      gcloud storage rsync "$DIST" "gs://$BUCKET" --recursive --delete-unmatched-destination-objects

      # Set long cache on hashed assets (they are content-addressed).
      gcloud storage objects update "gs://$BUCKET/assets/**" \
        --cache-control="public, max-age=31536000, immutable" 2>/dev/null || true

      # index.html must always revalidate.
      gcloud storage objects update "gs://$BUCKET/index.html" \
        --cache-control="no-cache, no-store"
    EOT
  }

  depends_on = [google_storage_bucket.app]
}
