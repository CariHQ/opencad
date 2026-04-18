# ── GCS buckets ──────────────────────────────────────────────────────────────

resource "google_storage_bucket" "landing" {
  name                        = "opencad-landing"
  project                     = var.project
  location                    = "US"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  cors {
    origin          = ["https://${var.domain}", "https://www.${var.domain}"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "app" {
  name                        = "opencad-app"
  project                     = var.project
  location                    = "US"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  cors {
    origin          = ["https://app.${var.domain}"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }
}

# ── Public read access ────────────────────────────────────────────────────────

resource "google_storage_bucket_iam_member" "landing_public" {
  bucket = google_storage_bucket.landing.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket_iam_member" "app_public" {
  bucket = google_storage_bucket.app.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ── Project file storage (used by the API server) ────────────────────────────

resource "google_storage_bucket" "files" {
  name                        = "opencad-files"
  project                     = var.project
  location                    = "US"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  lifecycle { prevent_destroy = true }
}

# Cloud Run (Compute SA) needs to read and write project files
resource "google_storage_bucket_iam_member" "files_server" {
  bucket = google_storage_bucket.files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# ── CDN backend buckets ───────────────────────────────────────────────────────

resource "google_compute_backend_bucket" "landing" {
  name        = "opencad-landing-backend"
  bucket_name = google_storage_bucket.landing.name
  enable_cdn  = true
  project     = var.project

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
}

resource "google_compute_backend_bucket" "app" {
  name        = "opencad-app-backend"
  bucket_name = google_storage_bucket.app.name
  enable_cdn  = true
  project     = var.project

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
}
