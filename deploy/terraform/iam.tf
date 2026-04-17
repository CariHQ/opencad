# ── CI/CD service account ────────────────────────────────────────────────────

resource "google_service_account" "ci" {
  account_id   = "opencad-ci"
  display_name = "OpenCAD CI/CD"
  project      = var.project
}

locals {
  ci_roles = [
    "roles/artifactregistry.writer",
    "roles/cloudsql.client",
    "roles/iam.serviceAccountUser",
    "roles/run.admin",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
  ]
}

resource "google_project_iam_member" "ci_roles" {
  for_each = toset(local.ci_roles)

  project = var.project
  role    = each.value
  member  = "serviceAccount:${google_service_account.ci.email}"
}

# ── Cloud Run service identity ────────────────────────────────────────────────
# The default Compute service account needs Secret Manager access so Cloud Run
# can mount secrets via --set-secrets.

data "google_project" "project" {
  project_id = var.project
}

resource "google_project_iam_member" "compute_secret_accessor" {
  project = var.project
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# ── Workload Identity Federation (for GitHub Actions CI) ─────────────────────

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  project                   = var.project
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub"
  project                            = var.project

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository_owner=='CariHQ'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub Actions (from CariHQ/opencad) to impersonate the CI service account.
resource "google_service_account_iam_member" "github_wif" {
  service_account_id = google_service_account.ci.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/CariHQ/opencad"
}

# ── Terraform state bucket IAM ───────────────────────────────────────────────

resource "google_storage_bucket_iam_member" "tf_state_admin" {
  bucket = "opencad-tf-state"
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.ci.email}"
}
