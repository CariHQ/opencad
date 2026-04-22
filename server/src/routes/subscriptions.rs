//! User subscription endpoints.
//!
//! All money flows through Stripe. This module never stores plan state
//! independently from what Stripe reports: checkout hands off to Stripe,
//! Stripe's webhook fires, we mirror the new state into `users`. The
//! webhook is the single source of truth.
//!
//! Route list:
//!   GET  /api/v1/subscription/status     current plan + status + period end
//!   POST /api/v1/subscription/checkout   returns a Stripe Checkout URL
//!   POST /api/v1/subscription/portal     returns a Stripe Customer Portal URL
//!   GET  /api/v1/subscription/invoices   paginated invoice list from Stripe
//!   POST /api/v1/stripe/webhook          (public) Stripe → us
//!
//! The webhook is deliberately mounted on the public router: Stripe can't
//! send a Firebase token. Instead we verify the `Stripe-Signature` HMAC
//! against STRIPE_WEBHOOK_SECRET in `verify_stripe_signature` below.

use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, TimeZone, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::FromRow;
use subtle::ConstantTimeEq;

use crate::{
    auth::AuthUser,
    error::{AppError, Result},
    state::AppState,
};

// ── Response shape ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionStatus {
    pub tier: String,
    pub subscription_status: Option<String>,
    /// Milliseconds since epoch for the end of the current paid period.
    pub valid_until: Option<i64>,
    /// true when the user has asked Stripe to cancel at period end but
    /// the period hasn't elapsed yet — they still have full access until
    /// `validUntil`, then drop to free.
    pub cancel_at_period_end: bool,
    /// Convenience for the frontend: trial / active / grace / expired.
    /// "grace" = subscription_status is 'past_due' or cancel_at_period_end
    /// with validUntil still in the future.
    pub access_mode: String,
}

#[derive(Debug, FromRow)]
struct UserSubRow {
    plan: String,
    trial_expires_at: Option<DateTime<Utc>>,
    stripe_customer_id: Option<String>,
    subscription_status: Option<String>,
    subscription_current_period_end: Option<DateTime<Utc>>,
    subscription_cancel_at_period_end: bool,
}

fn access_mode(row: &UserSubRow, now: DateTime<Utc>) -> &'static str {
    // Paying customer with an active/trialing Stripe subscription — full access.
    if matches!(row.subscription_status.as_deref(), Some("active") | Some("trialing")) {
        if row.subscription_cancel_at_period_end {
            return "grace"; // paid but winding down
        }
        return "active";
    }
    // Payment failed but within Stripe's dunning window — read-only.
    if row.subscription_status.as_deref() == Some("past_due") {
        return "grace";
    }
    // Free plan while trial is still valid — full access (it's a trial).
    if row.plan == "trial" || row.plan == "free" {
        if let Some(exp) = row.trial_expires_at {
            if exp > now {
                return "trial";
            }
            return "expired";
        }
    }
    "expired"
}

fn is_admin(uid: &str, admin_uids: &Option<String>) -> bool {
    match admin_uids {
        Some(list) => list.split(',').any(|a| a.trim() == uid),
        None => false,
    }
}

/// GET /api/v1/subscription/status
pub async fn get_status(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<SubscriptionStatus>> {
    let uid = user.uid().unwrap_or("dev-local");
    // OpenCAD staff (ADMIN_UIDS) are never put into read-only mode. Their
    // plan badge still reflects the real DB state, but accessMode is
    // forced to 'active' so the UI doesn't gate editing on a trial expiry
    // for the team that builds and demos the product.
    let admin_bypass = is_admin(uid, &s.admin_uids);
    let row: UserSubRow = sqlx::query_as(
        r#"SELECT plan, trial_expires_at, stripe_customer_id,
                  subscription_status, subscription_current_period_end,
                  subscription_cancel_at_period_end
           FROM users WHERE firebase_uid = $1"#,
    )
    .bind(uid)
    .fetch_optional(&s.db)
    .await?
    .ok_or(AppError::NotFound)?;

    let now = Utc::now();
    // When there's no Stripe subscription at all, surface the trial window
    // as valid_until so the UI can show "X days remaining".
    let valid_until = row
        .subscription_current_period_end
        .or(row.trial_expires_at)
        .map(|dt| dt.timestamp_millis());

    let derived = access_mode(&row, now);
    let effective = if admin_bypass && derived == "expired" { "active" } else { derived };

    Ok(Json(SubscriptionStatus {
        tier: row.plan.clone(),
        subscription_status: row.subscription_status.clone(),
        valid_until,
        cancel_at_period_end: row.subscription_cancel_at_period_end,
        access_mode: effective.to_string(),
    }))
}

// ── Checkout ─────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CheckoutBody {
    pub tier: String, // 'pro' | 'business'
}

#[derive(Debug, Serialize)]
pub struct CheckoutResponse {
    pub url: String,
}

/// POST /api/v1/subscription/checkout
pub async fn create_checkout(
    State(s): State<AppState>,
    user: AuthUser,
    Json(body): Json<CheckoutBody>,
) -> Result<Json<CheckoutResponse>> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let email = user.email().unwrap_or("");

    // Pick the right price id for the requested tier.
    let price_id = match body.tier.as_str() {
        "pro" => s.stripe_price_pro.as_deref(),
        "business" => s.stripe_price_business.as_deref(),
        other => return Err(AppError::BadRequest(format!("unknown tier: {other}"))),
    }
    .ok_or_else(|| AppError::BadRequest(format!(
        "STRIPE_PRICE_{} not configured on the server",
        body.tier.to_uppercase(),
    )))?;

    let stripe_key = s.stripe_secret_key.as_deref().ok_or_else(|| {
        AppError::BadRequest("Stripe not configured on the server".into())
    })?;

    // Reuse the user's existing Stripe customer if we have one, otherwise
    // Stripe will create one during Checkout and the webhook will persist
    // the id on our side.
    let existing_customer: Option<String> = sqlx::query_scalar(
        "SELECT stripe_customer_id FROM users WHERE firebase_uid = $1",
    )
    .bind(uid)
    .fetch_optional(&s.db)
    .await?
    .flatten();

    let success = format!(
        "{}/billing?session={{CHECKOUT_SESSION_ID}}",
        s.app_base_url.trim_end_matches('/'),
    );
    let cancel = format!("{}/billing?canceled=1", s.app_base_url.trim_end_matches('/'));

    let mut params: Vec<(&str, String)> = vec![
        ("mode", "subscription".into()),
        ("line_items[0][price]", price_id.to_string()),
        ("line_items[0][quantity]", "1".into()),
        ("success_url", success),
        ("cancel_url", cancel),
        ("client_reference_id", uid.to_string()),
        ("subscription_data[metadata][firebase_uid]", uid.to_string()),
        ("metadata[firebase_uid]", uid.to_string()),
    ];
    match existing_customer {
        Some(c) => params.push(("customer", c)),
        None if !email.is_empty() => params.push(("customer_email", email.to_string())),
        None => {}
    }

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.stripe.com/v1/checkout/sessions")
        .basic_auth(stripe_key, Some(""))
        .form(&params)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("stripe checkout: {e}")))?;
    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!(
            "stripe checkout failed: {body}"
        )));
    }
    #[derive(Deserialize)]
    struct SessionOut { url: String }
    let out: SessionOut = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("{e}")))?;

    Ok(Json(CheckoutResponse { url: out.url }))
}

// ── Customer Portal ──────────────────────────────────────────────────────────

/// POST /api/v1/subscription/portal
pub async fn open_portal(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<CheckoutResponse>> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let stripe_key = s.stripe_secret_key.as_deref().ok_or_else(|| {
        AppError::BadRequest("Stripe not configured on the server".into())
    })?;

    let customer_id: Option<String> = sqlx::query_scalar(
        "SELECT stripe_customer_id FROM users WHERE firebase_uid = $1",
    )
    .bind(uid)
    .fetch_optional(&s.db)
    .await?
    .flatten();

    let customer_id = customer_id.ok_or_else(|| {
        AppError::BadRequest("No Stripe customer on file — subscribe first".into())
    })?;

    let return_url = format!("{}/billing", s.app_base_url.trim_end_matches('/'));
    let params = [("customer", customer_id.as_str()), ("return_url", return_url.as_str())];

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.stripe.com/v1/billing_portal/sessions")
        .basic_auth(stripe_key, Some(""))
        .form(&params)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("stripe portal: {e}")))?;
    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!(
            "stripe portal failed: {body}"
        )));
    }
    #[derive(Deserialize)]
    struct PortalOut { url: String }
    let out: PortalOut = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("{e}")))?;

    Ok(Json(CheckoutResponse { url: out.url }))
}

// ── Invoices ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceSummary {
    pub id: String,
    pub number: Option<String>,
    pub created: i64,
    pub amount_paid: i64,
    pub currency: String,
    pub status: String,
    pub hosted_invoice_url: Option<String>,
    pub invoice_pdf: Option<String>,
}

/// GET /api/v1/subscription/invoices
pub async fn list_invoices(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<InvoiceSummary>>> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let stripe_key = match s.stripe_secret_key.as_deref() {
        Some(k) => k,
        None => return Ok(Json(vec![])), // Stripe not configured → empty list
    };
    let customer_id: Option<String> = sqlx::query_scalar(
        "SELECT stripe_customer_id FROM users WHERE firebase_uid = $1",
    )
    .bind(uid)
    .fetch_optional(&s.db)
    .await?
    .flatten();
    let Some(customer_id) = customer_id else {
        return Ok(Json(vec![]));
    };

    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.stripe.com/v1/invoices")
        .basic_auth(stripe_key, Some(""))
        .query(&[("customer", customer_id.as_str()), ("limit", "24")])
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("{e}")))?;
    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!(
            "stripe invoices failed: {body}"
        )));
    }
    #[derive(Deserialize)]
    struct InvoiceRaw {
        id: String,
        number: Option<String>,
        created: i64,
        amount_paid: i64,
        currency: String,
        status: String,
        hosted_invoice_url: Option<String>,
        invoice_pdf: Option<String>,
    }
    #[derive(Deserialize)]
    struct List { data: Vec<InvoiceRaw> }
    let list: List = resp.json().await.map_err(|e| AppError::Internal(anyhow::anyhow!("{e}")))?;
    let summaries: Vec<InvoiceSummary> = list
        .data
        .into_iter()
        .map(|i| InvoiceSummary {
            id: i.id,
            number: i.number,
            created: i.created,
            amount_paid: i.amount_paid,
            currency: i.currency,
            status: i.status,
            hosted_invoice_url: i.hosted_invoice_url,
            invoice_pdf: i.invoice_pdf,
        })
        .collect();
    Ok(Json(summaries))
}

// ── Webhook ─────────────────────────────────────────────────────────────────

/// POST /api/v1/stripe/webhook (public, Stripe → us)
///
/// Stripe signs every webhook with a timestamp and HMAC over
/// `timestamp.payload`. We verify the signature against our webhook
/// secret before trusting any event content. Never apply state changes
/// without verification — an attacker with our public URL could
/// otherwise flip every user to `business`.
pub async fn stripe_webhook(
    State(s): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let secret = match s.stripe_webhook_secret.as_deref() {
        Some(s) => s,
        None => {
            tracing::warn!("Stripe webhook hit but STRIPE_WEBHOOK_SECRET unset");
            return (StatusCode::SERVICE_UNAVAILABLE, "webhook not configured").into_response();
        }
    };
    let sig_header = headers
        .get("stripe-signature")
        .and_then(|h| h.to_str().ok())
        .unwrap_or_default();

    if !verify_stripe_signature(sig_header, &body, secret) {
        tracing::warn!("rejected Stripe webhook: bad signature");
        return (StatusCode::BAD_REQUEST, "bad signature").into_response();
    }

    let raw = match std::str::from_utf8(&body) {
        Ok(r) => r,
        Err(_) => return (StatusCode::BAD_REQUEST, "non-utf8 body").into_response(),
    };
    let event: StripeEvent = match serde_json::from_str(raw) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!("failed to parse Stripe event: {e}");
            return (StatusCode::BAD_REQUEST, "bad event").into_response();
        }
    };

    if let Err(e) = apply_stripe_event(&s, &event).await {
        tracing::error!("failed to apply Stripe event {}: {e:#}", event.id);
        return (StatusCode::INTERNAL_SERVER_ERROR, "apply failed").into_response();
    }

    (StatusCode::OK, "ok").into_response()
}

#[derive(Debug, Deserialize)]
struct StripeEvent {
    id: String,
    #[serde(rename = "type")]
    event_type: String,
    data: StripeEventData,
}

#[derive(Debug, Deserialize)]
struct StripeEventData {
    object: serde_json::Value,
}

/// Dispatch known event types. Unknown types are logged and ignored —
/// Stripe sends events we never subscribe to (test events, etc.) and
/// failing on them would poison the delivery retry queue.
async fn apply_stripe_event(s: &AppState, event: &StripeEvent) -> Result<()> {
    match event.event_type.as_str() {
        "checkout.session.completed" => apply_checkout_completed(s, &event.data.object).await,
        "customer.subscription.created"
        | "customer.subscription.updated"
        | "customer.subscription.deleted" => {
            apply_subscription_change(s, &event.data.object).await
        }
        "invoice.paid" | "invoice.payment_failed" => {
            // These update the subscription.status via a follow-on
            // customer.subscription.updated event, so we can safely ignore
            // them here. Logging for observability.
            tracing::info!("stripe event {} received (no-op)", event.event_type);
            Ok(())
        }
        other => {
            tracing::debug!("stripe event {other} ignored");
            Ok(())
        }
    }
}

/// Pull the Firebase UID out of a Stripe Checkout Session. Checkout
/// stamps it under `client_reference_id` when we create the session.
async fn apply_checkout_completed(s: &AppState, session: &serde_json::Value) -> Result<()> {
    let uid = session
        .get("client_reference_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let customer_id = session
        .get("customer")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let subscription_id = session
        .get("subscription")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    if uid.is_empty() || customer_id.is_empty() {
        tracing::warn!("checkout.session.completed missing uid or customer");
        return Ok(());
    }

    // Persist customer + subscription ids. The follow-on
    // customer.subscription.updated event will fill in status and period.
    sqlx::query(
        r#"UPDATE users
           SET stripe_customer_id     = $1,
               stripe_subscription_id = NULLIF($2, '')
           WHERE firebase_uid = $3"#,
    )
    .bind(customer_id)
    .bind(subscription_id)
    .bind(uid)
    .execute(&s.db)
    .await?;
    Ok(())
}

async fn apply_subscription_change(s: &AppState, sub: &serde_json::Value) -> Result<()> {
    let status = sub.get("status").and_then(|v| v.as_str()).unwrap_or_default();
    let customer_id = sub.get("customer").and_then(|v| v.as_str()).unwrap_or_default();
    let subscription_id = sub.get("id").and_then(|v| v.as_str()).unwrap_or_default();
    let cancel_at_end = sub
        .get("cancel_at_period_end")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let period_end = sub
        .get("current_period_end")
        .and_then(|v| v.as_i64())
        .and_then(|secs| Utc.timestamp_opt(secs, 0).single());

    // Pull the metadata we stamped at checkout time to find our user.
    let uid_from_meta = sub
        .get("metadata")
        .and_then(|m| m.get("firebase_uid"))
        .and_then(|v| v.as_str());

    // Derive the plan tier from the price id on the subscription item.
    let price_id = sub
        .get("items")
        .and_then(|i| i.get("data"))
        .and_then(|d| d.get(0))
        .and_then(|item| item.get("price"))
        .and_then(|p| p.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let tier_from_price = if s.stripe_price_business.as_deref() == Some(price_id) {
        "business"
    } else if s.stripe_price_pro.as_deref() == Some(price_id) {
        "pro"
    } else {
        "free"
    };

    // On hard cancel, reset to free.
    let effective_tier = if status == "canceled" || status == "incomplete_expired" {
        "free"
    } else {
        tier_from_price
    };

    let query = r#"UPDATE users
       SET plan                              = $1,
           stripe_subscription_id            = $2,
           subscription_status               = $3,
           subscription_current_period_end   = $4,
           subscription_cancel_at_period_end = $5
       WHERE stripe_customer_id = $6
          OR firebase_uid = $7"#;

    sqlx::query(query)
        .bind(effective_tier)
        .bind(if status == "canceled" { None } else { Some(subscription_id) })
        .bind(status)
        .bind(period_end)
        .bind(cancel_at_end)
        .bind(customer_id)
        .bind(uid_from_meta.unwrap_or(""))
        .execute(&s.db)
        .await?;
    Ok(())
}

// ── Signature verification ───────────────────────────────────────────────────

/// Verify Stripe's `Stripe-Signature` header format:
///   `t=<timestamp>,v1=<hex hmac-sha256>`
///
/// Constant-time compare on the hex-decoded signature to prevent timing
/// attacks. We also reject signatures older than 5 minutes to mitigate
/// replay, matching Stripe's recommended tolerance.
fn verify_stripe_signature(header: &str, payload: &[u8], secret: &str) -> bool {
    let mut timestamp: Option<i64> = None;
    let mut signatures: Vec<Vec<u8>> = Vec::new();
    for part in header.split(',') {
        let Some((k, v)) = part.split_once('=') else { continue };
        match k {
            "t" => timestamp = v.parse::<i64>().ok(),
            "v1" => {
                if let Ok(bytes) = hex::decode(v) {
                    signatures.push(bytes);
                }
            }
            _ => {}
        }
    }
    let Some(ts) = timestamp else { return false };
    let age = Utc::now().timestamp().saturating_sub(ts);
    if !(0..=300).contains(&age) {
        return false;
    }

    let mut signed = Vec::with_capacity(payload.len() + 32);
    signed.extend_from_slice(ts.to_string().as_bytes());
    signed.push(b'.');
    signed.extend_from_slice(payload);

    type HmacSha256 = Hmac<Sha256>;
    let Ok(mut mac) = HmacSha256::new_from_slice(secret.as_bytes()) else { return false };
    mac.update(&signed);
    let expected = mac.finalize().into_bytes();

    signatures
        .iter()
        .any(|sig| sig.ct_eq(expected.as_slice()).into())
}

// ── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn sign(secret: &str, ts: i64, payload: &[u8]) -> String {
        type HmacSha256 = Hmac<Sha256>;
        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        let mut signed = Vec::new();
        signed.extend_from_slice(ts.to_string().as_bytes());
        signed.push(b'.');
        signed.extend_from_slice(payload);
        mac.update(&signed);
        hex::encode(mac.finalize().into_bytes())
    }

    #[test]
    fn webhook_verify_accepts_fresh_signature() {
        let now = Utc::now().timestamp();
        let payload = br#"{"id":"evt_test"}"#;
        let sig = sign("whsec_test", now, payload);
        let header = format!("t={now},v1={sig}");
        assert!(verify_stripe_signature(&header, payload, "whsec_test"));
    }

    #[test]
    fn webhook_verify_rejects_wrong_secret() {
        let now = Utc::now().timestamp();
        let payload = br#"{"id":"evt_test"}"#;
        let sig = sign("whsec_wrong", now, payload);
        let header = format!("t={now},v1={sig}");
        assert!(!verify_stripe_signature(&header, payload, "whsec_test"));
    }

    #[test]
    fn webhook_verify_rejects_stale_timestamp() {
        let old = (Utc::now() - Duration::minutes(10)).timestamp();
        let payload = br#"{"id":"evt_test"}"#;
        let sig = sign("whsec_test", old, payload);
        let header = format!("t={old},v1={sig}");
        assert!(!verify_stripe_signature(&header, payload, "whsec_test"));
    }

    #[test]
    fn webhook_verify_rejects_malformed_header() {
        let payload = br#"{"id":"evt_test"}"#;
        assert!(!verify_stripe_signature("", payload, "whsec_test"));
        assert!(!verify_stripe_signature("not-a-header", payload, "whsec_test"));
        assert!(!verify_stripe_signature("t=abc,v1=xyz", payload, "whsec_test"));
    }

    #[test]
    fn access_mode_reads_expired_trial_as_expired() {
        let row = UserSubRow {
            plan: "free".into(),
            trial_expires_at: Some(Utc::now() - Duration::days(1)),
            stripe_customer_id: None,
            subscription_status: None,
            subscription_current_period_end: None,
            subscription_cancel_at_period_end: false,
        };
        assert_eq!(access_mode(&row, Utc::now()), "expired");
    }

    #[test]
    fn access_mode_reads_active_subscription_as_active() {
        let row = UserSubRow {
            plan: "pro".into(),
            trial_expires_at: None,
            stripe_customer_id: Some("cus_1".into()),
            subscription_status: Some("active".into()),
            subscription_current_period_end: Some(Utc::now() + Duration::days(25)),
            subscription_cancel_at_period_end: false,
        };
        assert_eq!(access_mode(&row, Utc::now()), "active");
    }

    #[test]
    fn access_mode_past_due_is_grace() {
        let row = UserSubRow {
            plan: "pro".into(),
            trial_expires_at: None,
            stripe_customer_id: Some("cus_1".into()),
            subscription_status: Some("past_due".into()),
            subscription_current_period_end: Some(Utc::now() + Duration::days(5)),
            subscription_cancel_at_period_end: false,
        };
        assert_eq!(access_mode(&row, Utc::now()), "grace");
    }

    #[test]
    fn access_mode_cancel_at_period_end_is_grace() {
        let row = UserSubRow {
            plan: "pro".into(),
            trial_expires_at: None,
            stripe_customer_id: Some("cus_1".into()),
            subscription_status: Some("active".into()),
            subscription_current_period_end: Some(Utc::now() + Duration::days(15)),
            subscription_cancel_at_period_end: true,
        };
        assert_eq!(access_mode(&row, Utc::now()), "grace");
    }
}
