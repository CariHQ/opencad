/// Firebase ID token verification.
///
/// Firebase tokens are RS256 JWTs signed by Google's service account.
/// Public keys are fetched from Google's JWKS-like X.509 endpoint and
/// cached in memory (refreshed when Google's Cache-Control header expires).
///
/// We verify:
///   - Signature (RSA-SHA256 via jsonwebtoken)
///   - `exp` — not expired
///   - `iat` — issued in the past (< 10 min clock skew tolerance handled by lib)
///   - `aud` — matches our Firebase project ID
///   - `iss` — matches Google's issuer for the project
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};

use anyhow::{Context, Result};
use axum::{
    extract::{FromRequestParts, State},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

// ── Public‑key cache ─────────────────────────────────────────────────────────

const GOOGLE_CERT_URL: &str =
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

#[derive(Clone)]
struct CachedKeys {
    keys: HashMap<String, String>, // kid → PEM cert
    expires: Instant,
}

#[derive(Clone)]
pub struct FirebaseVerifier {
    project_id: String,
    cache: Arc<RwLock<Option<CachedKeys>>>,
    http: reqwest::Client,
}

impl FirebaseVerifier {
    pub fn new(project_id: impl Into<String>) -> Self {
        Self {
            project_id: project_id.into(),
            cache: Arc::new(RwLock::new(None)),
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .expect("reqwest client"),
        }
    }

    /// Fetch or return cached public keys.
    async fn keys(&self) -> Result<HashMap<String, String>> {
        // Fast path: cache is still valid
        {
            let guard = self.cache.read().await;
            if let Some(ref c) = *guard {
                if c.expires > Instant::now() {
                    return Ok(c.keys.clone());
                }
            }
        }

        // Slow path: fetch fresh keys
        let resp = self
            .http
            .get(GOOGLE_CERT_URL)
            .send()
            .await
            .context("fetching Google public keys")?;

        // Parse Cache-Control max-age for TTL
        let ttl = resp
            .headers()
            .get("cache-control")
            .and_then(|v| v.to_str().ok())
            .and_then(parse_max_age)
            .unwrap_or(3600);

        let keys: HashMap<String, String> = resp
            .json()
            .await
            .context("parsing Google public keys JSON")?;

        let cached = CachedKeys {
            keys: keys.clone(),
            expires: Instant::now() + Duration::from_secs(ttl),
        };
        *self.cache.write().await = Some(cached);
        Ok(keys)
    }

    /// Verify a Firebase ID token and return the decoded claims on success.
    pub async fn verify(&self, token: &str) -> Result<FirebaseClaims> {
        let header =
            decode_header(token).context("invalid token header")?;

        let kid = header.kid.context("token missing kid")?;
        let keys = self.keys().await?;
        let pem = keys.get(&kid).with_context(|| format!("unknown kid: {kid}"))?;

        let decoding_key =
            DecodingKey::from_rsa_pem(pem.as_bytes()).context("invalid RSA PEM")?;

        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_audience(&[&self.project_id]);
        validation.set_issuer(&[format!(
            "https://securetoken.google.com/{}",
            self.project_id
        )]);

        let data = decode::<FirebaseClaims>(token, &decoding_key, &validation)
            .context("token verification failed")?;

        Ok(data.claims)
    }
}

fn parse_max_age(cc: &str) -> Option<u64> {
    cc.split(',')
        .find_map(|part| part.trim().strip_prefix("max-age="))
        .and_then(|v| v.trim().parse().ok())
}

// ── Firebase JWT claims ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirebaseClaims {
    /// Firebase UID (subject)
    pub sub: String,
    /// Verified email
    pub email: Option<String>,
    /// Display name (may be absent)
    pub name: Option<String>,
    /// Email verified flag
    pub email_verified: Option<bool>,
    // Standard JWT
    pub exp: u64,
    pub iat: u64,
    pub aud: String,
    pub iss: String,
}

// ── Axum extractor ─────────────────────────────────────────────────────────

/// Axum request-part extractor that resolves the authenticated Firebase user.
/// Returns `401` if auth is enabled and no valid token is present.
/// Returns `Ok(AuthUser::Unauthenticated)` when auth is disabled (dev mode).
#[derive(Debug, Clone)]
pub enum AuthUser {
    Authenticated(FirebaseClaims),
    Unauthenticated,
}

impl AuthUser {
    pub fn uid(&self) -> Option<&str> {
        match self {
            AuthUser::Authenticated(c) => Some(&c.sub),
            AuthUser::Unauthenticated => None,
        }
    }

    pub fn email(&self) -> Option<&str> {
        match self {
            AuthUser::Authenticated(c) => c.email.as_deref(),
            AuthUser::Unauthenticated => None,
        }
    }
}

/// Shared verifier held in app state (None when auth_enabled = false)
pub type OptVerifier = Option<Arc<FirebaseVerifier>>;

// This extractor is used by route handlers via `Extension<AuthUser>` after
// the auth middleware resolves it.  We implement the full extractor for
// convenience so individual handlers can just declare `AuthUser` as a param.
#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // The middleware inserts AuthUser into extensions; retrieve it here.
        parts
            .extensions
            .get::<AuthUser>()
            .cloned()
            .ok_or(AuthError::Missing)
    }
}

// ── Auth middleware ──────────────────────────────────────────────────────────

/// Tower middleware layer that verifies the Bearer token and inserts
/// `AuthUser` into request extensions.  Routes that need auth extract it.
pub async fn auth_middleware(
    State(verifier): State<OptVerifier>,
    mut req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> Response {
    let user = match &verifier {
        None => AuthUser::Unauthenticated,
        Some(v) => {
            let token = req
                .headers()
                .get(axum::http::header::AUTHORIZATION)
                .and_then(|val| val.to_str().ok())
                .and_then(|val| val.strip_prefix("Bearer "))
                .map(str::to_string);

            match token {
                None => return AuthError::Missing.into_response(),
                Some(t) => match v.verify(&t).await {
                    Ok(claims) => AuthUser::Authenticated(claims),
                    Err(e) => {
                        tracing::warn!("auth failed: {e:#}");
                        return AuthError::Invalid.into_response();
                    }
                },
            }
        }
    };

    req.extensions_mut().insert(user);
    next.run(req).await
}

// ── Error type ───────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum AuthError {
    Missing,
    Invalid,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (code, msg) = match self {
            AuthError::Missing => (StatusCode::UNAUTHORIZED, "Authorization header required"),
            AuthError::Invalid => (StatusCode::UNAUTHORIZED, "Invalid or expired token"),
        };
        (code, msg).into_response()
    }
}
