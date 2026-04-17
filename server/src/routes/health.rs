use axum::Json;
use serde_json::{json, Value};

/// T-API-001: GET /health — liveness probe for Cloud Run / load balancers.
pub async fn health() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "opencad-server",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn t_api_001_health_ok() {
        let Json(body) = health().await;
        assert_eq!(body["status"], "ok");
        assert_eq!(body["service"], "opencad-server");
        assert!(body["version"].is_string());
    }
}
