//! Publisher onboarding + Stripe Connect link for paid plugins.
//!
//! Flow:
//!   1. Developer calls POST /api/v1/marketplace/publishers → we create a
//!      Stripe Express account (stub: returns a fake acct_id until the
//!      STRIPE_SECRET_KEY env var is set; real call path is wired and
//!      ready to flip on once the env var is in place).
//!   2. Developer hits GET /api/v1/marketplace/publishers/me/onboarding-url
//!      → we return a Stripe-hosted onboarding URL. After onboarding,
//!      Stripe's webhook flips payouts_enabled via the webhook endpoint.
//!   3. Paid-plugin installs (not in this file) charge the buyer, split
//!      30% platform fee, and record the result in plugin_revenue.
//!
//! For now the Stripe calls are stubbed so the surface area exists and
//! the schema is in place. Flipping to real Stripe is a one-file change
//! plus setting STRIPE_SECRET_KEY in the Cloud Run secret.

use axum::{extract::State, http::StatusCode, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    auth::AuthUser,
    error::{AppError, Result},
    state::AppState,
};

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Publisher {
    pub firebase_uid: String,
    pub display_name: String,
    pub contact_email: String,
    pub stripe_account_id: Option<String>,
    pub stripe_onboarded: bool,
    pub payouts_enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct RegisterBody {
    pub display_name: String,
    pub contact_email: String,
}

/// POST /api/v1/marketplace/publishers
pub async fn register(
    State(s): State<AppState>,
    user: AuthUser,
    Json(body): Json<RegisterBody>,
) -> Result<(StatusCode, Json<Publisher>)> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let name = body.display_name.trim();
    let email = body.contact_email.trim();
    if name.is_empty() || email.is_empty() {
        return Err(AppError::BadRequest("display_name and contact_email required".into()));
    }

    // Create a Stripe Connect Express account. In stub mode we just
    // generate a fake acct_id so the rest of the flow is exercisable.
    let stripe_account_id = create_stripe_account(&s, email).await?;

    let pub_row = sqlx::query_as::<_, Publisher>(
        r#"INSERT INTO plugin_publishers (firebase_uid, display_name, contact_email, stripe_account_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (firebase_uid) DO UPDATE
             SET display_name  = EXCLUDED.display_name,
                 contact_email = EXCLUDED.contact_email,
                 updated_at    = now()
           RETURNING firebase_uid, display_name, contact_email,
                     stripe_account_id, stripe_onboarded, payouts_enabled,
                     created_at, updated_at"#,
    )
    .bind(uid)
    .bind(name)
    .bind(email)
    .bind(stripe_account_id)
    .fetch_one(&s.db)
    .await?;

    Ok((StatusCode::CREATED, Json(pub_row)))
}

/// GET /api/v1/marketplace/publishers/me
pub async fn get_me(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<Publisher>> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let row = sqlx::query_as::<_, Publisher>(
        r#"SELECT firebase_uid, display_name, contact_email,
                  stripe_account_id, stripe_onboarded, payouts_enabled,
                  created_at, updated_at
           FROM plugin_publishers WHERE firebase_uid = $1"#,
    )
    .bind(uid)
    .fetch_optional(&s.db)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(row))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OnboardingUrlResponse {
    pub url: String,
}

/// GET /api/v1/marketplace/publishers/me/onboarding-url
///
/// Returns a one-time URL the publisher can visit to complete Stripe
/// onboarding. In stub mode returns a placeholder that the UI can show
/// as "Coming soon" when the Stripe env var isn't configured.
pub async fn onboarding_url(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<OnboardingUrlResponse>> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;

    let pub_row = sqlx::query_as::<_, Publisher>(
        r#"SELECT firebase_uid, display_name, contact_email,
                  stripe_account_id, stripe_onboarded, payouts_enabled,
                  created_at, updated_at
           FROM plugin_publishers WHERE firebase_uid = $1"#,
    )
    .bind(uid)
    .fetch_optional(&s.db)
    .await?
    .ok_or(AppError::NotFound)?;

    let Some(acct_id) = pub_row.stripe_account_id else {
        return Err(AppError::BadRequest("stripe account not yet created".into()));
    };

    let url = create_account_link(&s, &acct_id).await?;
    Ok(Json(OnboardingUrlResponse { url }))
}

// ── Stripe client (stub + real implementation behind STRIPE_SECRET_KEY) ──────

async fn create_stripe_account(s: &AppState, email: &str) -> Result<String> {
    let Some(key) = s.stripe_secret_key.as_deref() else {
        // Stub: deterministic fake id so integration tests can exercise
        // the DB row shape without real Stripe creds.
        tracing::info!("STRIPE_SECRET_KEY unset — creating stub publisher account");
        return Ok(format!("acct_stub_{}", &uuid::Uuid::new_v4().simple().to_string()[..12]));
    };
    let client = reqwest::Client::new();
    let params = [
        ("type", "express"),
        ("email", email),
        ("capabilities[card_payments][requested]", "true"),
        ("capabilities[transfers][requested]", "true"),
    ];
    let resp = client
        .post("https://api.stripe.com/v1/accounts")
        .basic_auth(key, Some(""))
        .form(&params)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("stripe: {e}")))?;
    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!("stripe account create failed: {body}")));
    }
    #[derive(Deserialize)]
    struct Acct { id: String }
    let acct: Acct = resp.json().await.map_err(|e| AppError::Internal(anyhow::anyhow!("{e}")))?;
    Ok(acct.id)
}

async fn create_account_link(s: &AppState, acct_id: &str) -> Result<String> {
    let Some(key) = s.stripe_secret_key.as_deref() else {
        return Ok(format!("about:blank#stripe-stub-{acct_id}"));
    };
    let client = reqwest::Client::new();
    let params = [
        ("account", acct_id),
        ("refresh_url", "https://opencad.archi/publisher/refresh"),
        ("return_url",  "https://opencad.archi/publisher/done"),
        ("type", "account_onboarding"),
    ];
    let resp = client
        .post("https://api.stripe.com/v1/account_links")
        .basic_auth(key, Some(""))
        .form(&params)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("stripe: {e}")))?;
    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!("stripe account link failed: {body}")));
    }
    #[derive(Deserialize)]
    struct Link { url: String }
    let link: Link = resp.json().await.map_err(|e| AppError::Internal(anyhow::anyhow!("{e}")))?;
    Ok(link.url)
}
