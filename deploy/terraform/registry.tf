resource "google_artifact_registry_repository" "opencad" {
  location      = var.region
  repository_id = "opencad"
  format        = "DOCKER"
  description   = "OpenCAD server Docker images"
  project       = var.project

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}
