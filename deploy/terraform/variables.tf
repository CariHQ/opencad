variable "project" {
  description = "GCP project ID"
  type        = string
  default     = "opencad-prod"
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "us-central1"
}

variable "domain" {
  description = "Primary domain (no www)"
  type        = string
  default     = "opencad.archi"
}

# ── Deployment variables (change per release) ────────────────────────────────

variable "server_image" {
  description = "Full image URL for the Cloud Run server (e.g. us-central1-docker.pkg.dev/opencad-prod/opencad/opencad-server:abc1234)"
  type        = string
  default     = "us-central1-docker.pkg.dev/opencad-prod/opencad/opencad-server:latest"
}

variable "app_dist_path" {
  description = "Local path to the built React app (packages/app/dist)"
  type        = string
  default     = "../../packages/app/dist"
}

variable "landing_dir" {
  description = "Local path to the landing page source directory"
  type        = string
  default     = "../../packages/landing"
}

variable "app_version" {
  description = "Git SHA or version string; changing this forces a re-deploy of static assets"
  type        = string
  default     = "latest"
}

# ── Firebase config (injected into the app at deploy time) ──────────────────

variable "firebase_api_key" {
  description = "Firebase Web API key"
  type        = string
  sensitive   = true
}

variable "firebase_auth_domain" {
  description = "Firebase Auth domain (project.firebaseapp.com)"
  type        = string
  sensitive   = true
}

variable "firebase_project_id" {
  description = "Firebase / GCP project ID"
  type        = string
  default     = "opencad-prod"
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage bucket (project.appspot.com)"
  type        = string
  sensitive   = true
}

variable "firebase_messaging_sender_id" {
  description = "Firebase Cloud Messaging sender ID"
  type        = string
  sensitive   = true
}

variable "firebase_app_id" {
  description = "Firebase App ID"
  type        = string
  sensitive   = true
}

# ── Server config ─────────────────────────────────────────────────────────────

variable "database_url" {
  description = "PostgreSQL connection string for the server"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret for the server"
  type        = string
  sensitive   = true
}

variable "cors_origins" {
  description = "Allowed CORS origins for the API server"
  type        = string
  default     = "https://opencad.archi,https://app.opencad.archi"
}

variable "github_token" {
  description = "GitHub Personal Access Token for creating issues from in-app feedback"
  type        = string
  sensitive   = true
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository (owner/repo) where feedback issues are created"
  type        = string
  default     = "CariHQ/opencad"
}
