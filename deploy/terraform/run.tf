resource "google_cloud_run_v2_service" "server" {
  name     = "opencad-server"
  location = var.region
  project  = var.project
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.server_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      ports {
        container_port = 3000
      }

      env {
        name  = "AUTH_ENABLED"
        value = "true"
      }
      env {
        name  = "STORAGE_BACKEND"
        value = "gcs"
      }
      env {
        name  = "GCS_BUCKET"
        value = "opencad-files"
      }
      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.project
      }
      env {
        name  = "CORS_ORIGINS"
        value = var.cors_origins
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
    }

    # Cloud SQL connection
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = ["${var.project}:${var.region}:opencad-db"]
      }
    }

    timeout = "60s"
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_project_iam_member.compute_secret_accessor,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.jwt_secret,
  ]
}

# Allow unauthenticated (public) invocations
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
