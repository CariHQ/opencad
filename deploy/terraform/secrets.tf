# ── Secret containers ─────────────────────────────────────────────────────────
# Values are managed separately (terraform.tfvars / environment variables).
# Secrets are never committed to git.

resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "opencad-firebase-api-key"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "firebase_auth_domain" {
  secret_id = "opencad-firebase-auth-domain"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "firebase_project_id" {
  secret_id = "opencad-firebase-project-id"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "firebase_storage_bucket" {
  secret_id = "opencad-firebase-storage-bucket"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "firebase_messaging_sender_id" {
  secret_id = "opencad-firebase-messaging-sender-id"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "firebase_app_id" {
  secret_id = "opencad-firebase-app-id"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "opencad-database-url"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "opencad-jwt-secret"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "cors_origins" {
  secret_id = "opencad-cors-origins"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "gcs_bucket" {
  secret_id = "opencad-gcs-bucket"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "landing_bucket" {
  secret_id = "opencad-landing-bucket"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

resource "google_secret_manager_secret" "app_bucket" {
  secret_id = "opencad-app-bucket"
  project   = var.project
  replication {
    auto {}
  }
  lifecycle { prevent_destroy = true }
}

# ── Secret versions (set from variables) ─────────────────────────────────────
# These are updated whenever terraform apply runs with new values.

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret

  lifecycle {
    create_before_destroy = true
  }
}
