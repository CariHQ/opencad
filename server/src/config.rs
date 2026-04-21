use anyhow::{bail, Result};

#[derive(Debug, Clone, PartialEq)]
pub enum StorageBackend {
    Local,
    Gcs,
}

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub storage_backend: StorageBackend,
    /// Root directory for local file storage (STORAGE_BACKEND=local)
    pub storage_path: String,
    /// GCS bucket name (STORAGE_BACKEND=gcs)
    pub gcs_bucket: Option<String>,
    pub auth_enabled: bool,
    pub jwt_secret: String,
    /// Firebase project ID used to verify ID tokens (required when auth_enabled = true)
    pub firebase_project_id: Option<String>,
    /// Comma-separated list of allowed CORS origins
    pub cors_origins: Vec<String>,
    /// GitHub personal access token for creating issues (optional)
    pub github_token: Option<String>,
    /// GitHub repo in owner/repo format (e.g. "opencad/opencad")
    pub github_repo: Option<String>,
    /// Comma-separated Firebase UIDs granted marketplace admin rights
    /// (moderation queue, revoke kill switch). None → no admins.
    pub admin_uids: Option<String>,
    /// Public base URL where plugin bundles are hosted. When set, submissions
    /// without an absolute entrypoint URL have this prepended.
    pub plugin_bundle_base_url: Option<String>,
    /// Stripe secret key for marketplace payouts (optional; only needed for
    /// paid plugins) and for user subscription checkout/portal/webhook.
    pub stripe_secret_key: Option<String>,
    /// Stripe webhook signing secret. Required to verify webhook payloads
    /// before we apply subscription state changes to our database.
    pub stripe_webhook_secret: Option<String>,
    /// Stripe price id for the Pro tier ('price_…' from the dashboard).
    pub stripe_price_pro: Option<String>,
    /// Stripe price id for the Business tier.
    pub stripe_price_business: Option<String>,
    /// Public URL the Checkout success/cancel redirects should return to.
    pub app_base_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let storage_backend = match std::env::var("STORAGE_BACKEND")
            .unwrap_or_default()
            .as_str()
        {
            "gcs" => StorageBackend::Gcs,
            _ => StorageBackend::Local,
        };

        let gcs_bucket = std::env::var("GCS_BUCKET").ok();
        if storage_backend == StorageBackend::Gcs && gcs_bucket.is_none() {
            bail!("GCS_BUCKET must be set when STORAGE_BACKEND=gcs");
        }

        Ok(Self {
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse()?,
            database_url: std::env::var("DATABASE_URL").unwrap_or_else(|_| {
                "postgres://opencad:opencad@localhost:5432/opencad".into()
            }),
            storage_backend,
            storage_path: std::env::var("STORAGE_PATH")
                .unwrap_or_else(|_| "./data/files".into()),
            gcs_bucket,
            auth_enabled: std::env::var("AUTH_ENABLED")
                .map(|v| v == "true")
                .unwrap_or(false),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-in-production".into()),
            firebase_project_id: std::env::var("FIREBASE_PROJECT_ID").ok(),
            cors_origins: std::env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| {
                    "http://localhost:5173,http://localhost:1420".into()
                })
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),
            github_token: std::env::var("GITHUB_TOKEN").ok(),
            github_repo: std::env::var("GITHUB_REPO").ok(),
            admin_uids: std::env::var("ADMIN_UIDS").ok().filter(|s| !s.is_empty()),
            plugin_bundle_base_url: std::env::var("PLUGIN_BUNDLE_BASE_URL").ok(),
            stripe_secret_key: std::env::var("STRIPE_SECRET_KEY").ok(),
            stripe_webhook_secret: std::env::var("STRIPE_WEBHOOK_SECRET").ok(),
            stripe_price_pro: std::env::var("STRIPE_PRICE_PRO").ok(),
            stripe_price_business: std::env::var("STRIPE_PRICE_BUSINESS").ok(),
            app_base_url: std::env::var("APP_BASE_URL")
                .unwrap_or_else(|_| "https://app.opencad.archi".into()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // Serialise env-var tests so they don't race each other.
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn defaults_are_sane() {
        let _g = ENV_LOCK.lock().unwrap();
        std::env::remove_var("PORT");
        std::env::remove_var("DATABASE_URL");
        std::env::remove_var("STORAGE_BACKEND");
        std::env::remove_var("AUTH_ENABLED");

        let cfg = Config::from_env().unwrap();
        assert_eq!(cfg.port, 3000);
        assert_eq!(cfg.storage_backend, StorageBackend::Local);
        assert!(!cfg.auth_enabled);
    }

    #[test]
    fn port_from_env() {
        let _g = ENV_LOCK.lock().unwrap();
        std::env::set_var("PORT", "8080");
        let cfg = Config::from_env().unwrap();
        assert_eq!(cfg.port, 8080);
        std::env::remove_var("PORT");
    }
}
