#!/usr/bin/env bash
# Import existing GCP resources into Terraform state.
# Run this ONCE after 'terraform init', before 'terraform apply'.
#
# Usage:
#   cd deploy/terraform
#   terraform init
#   cd ..
#   bash import.sh

set -euo pipefail

PROJECT="opencad-prod"
REGION="us-central1"
cd "$(dirname "$0")/terraform"

tf() { terraform import "$@"; }

echo "==> Importing GCP APIs..."
APIS=(
  "artifactregistry.googleapis.com"
  "cloudbuild.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "cloudrun.googleapis.com"
  "compute.googleapis.com"
  "iam.googleapis.com"
  "iamcredentials.googleapis.com"
  "run.googleapis.com"
  "secretmanager.googleapis.com"
  "servicenetworking.googleapis.com"
  "sqladmin.googleapis.com"
  "storage.googleapis.com"
  "storage-component.googleapis.com"
)
for api in "${APIS[@]}"; do
  tf "google_project_service.apis[\"$api\"]" "$PROJECT/$api" || true
done

echo "==> Importing service account..."
tf google_service_account.ci \
  "projects/$PROJECT/serviceAccounts/opencad-ci@$PROJECT.iam.gserviceaccount.com" || true

echo "==> Importing project IAM members..."
ROLES=(
  "roles/artifactregistry.writer"
  "roles/cloudsql.client"
  "roles/iam.serviceAccountUser"
  "roles/run.admin"
  "roles/secretmanager.secretAccessor"
  "roles/storage.objectAdmin"
)
SA="opencad-ci@$PROJECT.iam.gserviceaccount.com"
for role in "${ROLES[@]}"; do
  tf "google_project_iam_member.ci_roles[\"$role\"]" \
    "$PROJECT $role serviceAccount:$SA" || true
done

echo "==> Importing compute SA secret accessor..."
COMPUTE_SA="$(gcloud projects describe $PROJECT --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
tf google_project_iam_member.compute_secret_accessor \
  "$PROJECT roles/secretmanager.secretAccessor serviceAccount:$COMPUTE_SA" || true

echo "==> Importing Workload Identity Federation..."
tf google_iam_workload_identity_pool.github \
  "projects/$PROJECT/locations/global/workloadIdentityPools/github-actions" || true
tf google_iam_workload_identity_pool_provider.github \
  "projects/$PROJECT/locations/global/workloadIdentityPools/github-actions/providers/github" || true
tf google_service_account_iam_member.github_wif \
  "projects/$PROJECT/serviceAccounts/opencad-ci@$PROJECT.iam.gserviceaccount.com roles/iam.workloadIdentityUser principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-actions/attribute.repository/CariHQ/opencad" || true

echo "==> Importing GCS buckets..."
tf google_storage_bucket.landing "$PROJECT/opencad-landing" || true
tf google_storage_bucket.app     "$PROJECT/opencad-app"     || true

echo "==> Importing bucket IAM..."
tf google_storage_bucket_iam_member.landing_public \
  "opencad-landing roles/storage.objectViewer allUsers" || true
tf google_storage_bucket_iam_member.app_public \
  "opencad-app roles/storage.objectViewer allUsers" || true
tf google_storage_bucket_iam_member.tf_state_admin \
  "opencad-tf-state roles/storage.objectAdmin serviceAccount:opencad-ci@$PROJECT.iam.gserviceaccount.com" || true

echo "==> Importing backend buckets..."
tf google_compute_backend_bucket.landing "$PROJECT/opencad-landing-backend" || true
tf google_compute_backend_bucket.app     "$PROJECT/opencad-app-backend"     || true

echo "==> Importing load balancer..."
tf google_compute_global_address.opencad_ip "$PROJECT/opencad-ip"                   || true
tf google_compute_managed_ssl_certificate.opencad "$PROJECT/opencad-cert"           || true
tf google_compute_url_map.opencad            "$PROJECT/opencad-url-map"             || true
tf google_compute_url_map.http_redirect      "$PROJECT/opencad-http-redirect"       || true
tf google_compute_target_http_proxy.http_redirect "$PROJECT/opencad-http-proxy"     || true
tf google_compute_target_https_proxy.opencad "$PROJECT/opencad-https-proxy"         || true
tf google_compute_global_forwarding_rule.http  "$PROJECT/opencad-http-rule"         || true
tf google_compute_global_forwarding_rule.https "$PROJECT/opencad-https-rule"        || true

echo "==> Importing Artifact Registry..."
tf google_artifact_registry_repository.opencad \
  "projects/$PROJECT/locations/$REGION/repositories/opencad" || true

echo "==> Importing Cloud Run service..."
tf google_cloud_run_v2_service.server \
  "projects/$PROJECT/locations/$REGION/services/opencad-server" || true
tf google_cloud_run_v2_service_iam_member.public \
  "projects/$PROJECT/locations/$REGION/services/opencad-server roles/run.invoker allUsers" || true

echo "==> Importing Cloud SQL..."
tf google_sql_database_instance.opencad "$PROJECT/opencad-db" || true
tf google_sql_database.opencad          "$PROJECT/opencad-db/opencad" || true

echo "==> Importing Secret Manager secrets..."
SECRETS=(
  "firebase_api_key:opencad-firebase-api-key"
  "firebase_auth_domain:opencad-firebase-auth-domain"
  "firebase_project_id:opencad-firebase-project-id"
  "firebase_storage_bucket:opencad-firebase-storage-bucket"
  "firebase_messaging_sender_id:opencad-firebase-messaging-sender-id"
  "firebase_app_id:opencad-firebase-app-id"
  "database_url:opencad-database-url"
  "jwt_secret:opencad-jwt-secret"
  "cors_origins:opencad-cors-origins"
  "gcs_bucket:opencad-gcs-bucket"
  "landing_bucket:opencad-landing-bucket"
  "app_bucket:opencad-app-bucket"
)
for entry in "${SECRETS[@]}"; do
  tf_name="${entry%%:*}"
  secret_id="${entry##*:}"
  tf "google_secret_manager_secret.$tf_name" \
    "projects/$PROJECT/secrets/$secret_id" || true
done

echo ""
echo "✓ Import complete. Run 'terraform plan' to review drift."
