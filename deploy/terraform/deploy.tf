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

      # Upload HTML pages (no-cache)
      for file in index.html privacy.html terms.html; do
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
