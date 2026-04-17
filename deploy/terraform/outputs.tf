output "load_balancer_ip" {
  description = "Global load balancer IP — point your DNS A records here"
  value       = google_compute_global_address.opencad_ip.address
}

output "landing_bucket" {
  description = "GCS bucket serving opencad.archi"
  value       = google_storage_bucket.landing.name
}

output "app_bucket" {
  description = "GCS bucket serving app.opencad.archi"
  value       = google_storage_bucket.app.name
}

output "server_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.server.uri
}

output "artifact_registry" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project}/${google_artifact_registry_repository.opencad.repository_id}"
}

output "ci_service_account" {
  description = "CI/CD service account email"
  value       = google_service_account.ci.email
}

output "wif_provider" {
  description = "Workload Identity Federation provider resource name (for GitHub Actions)"
  value       = google_iam_workload_identity_pool_provider.github.name
}
