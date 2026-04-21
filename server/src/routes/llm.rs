//! LLM Router — proxies AI chat completions to upstream providers so
//! enterprise deployments don't have to ship API keys to browsers.
//!
//! Clients POST `/api/v1/llm/chat` with `{ provider, model, messages }`
//! and the server selects the upstream endpoint based on `provider`
//! (`openai` / `anthropic` / `ollama`). Upstream credentials come from
//! server env (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`).
//!
//! Streaming isn't implemented here — the response is fully buffered
//! before being returned. Good enough for command-style usage
//! (prompt-to-project, compliance advisor); interactive chat that needs
//! token-by-token streaming will get its own SSE-capable route later.

use axum::{extract::State, http::StatusCode, response::Json};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub provider: String,            // "openai" | "anthropic" | "ollama"
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,                // "system" | "user" | "assistant"
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub content: String,
    pub model: String,
    pub provider: String,
}

pub async fn chat(
    State(_state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, (StatusCode, String)> {
    let content = match req.provider.as_str() {
        "openai"    => proxy_openai(&req).await,
        "anthropic" => proxy_anthropic(&req).await,
        "ollama"    => proxy_ollama(&req).await,
        other       => Err(format!("Unsupported provider: {other}")),
    }
    .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    Ok(Json(ChatResponse {
        content,
        model: req.model,
        provider: req.provider,
    }))
}

async fn proxy_openai(req: &ChatRequest) -> Result<String, String> {
    let key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| "OPENAI_API_KEY not set on server".to_string())?;
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature.unwrap_or(0.7),
        "max_tokens": req.max_tokens.unwrap_or(2048),
    });
    let res = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("openai request failed: {e}"))?;
    let json: Value = res.json().await.map_err(|e| format!("openai json parse: {e}"))?;
    json.pointer("/choices/0/message/content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "openai response missing choices[0].message.content".to_string())
}

async fn proxy_anthropic(req: &ChatRequest) -> Result<String, String> {
    let key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| "ANTHROPIC_API_KEY not set on server".to_string())?;
    let client = reqwest::Client::new();
    // Split out system messages as Anthropic's API expects them in a
    // top-level `system` field rather than inside `messages`.
    let mut system_parts = Vec::new();
    let mut user_parts = Vec::new();
    for m in &req.messages {
        if m.role == "system" {
            system_parts.push(m.content.clone());
        } else {
            user_parts.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }
    }
    let body = serde_json::json!({
        "model": req.model,
        "messages": user_parts,
        "system": system_parts.join("\n\n"),
        "max_tokens": req.max_tokens.unwrap_or(2048),
    });
    let res = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("anthropic request failed: {e}"))?;
    let json: Value = res.json().await.map_err(|e| format!("anthropic json parse: {e}"))?;
    json.pointer("/content/0/text")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "anthropic response missing content[0].text".to_string())
}

async fn proxy_ollama(req: &ChatRequest) -> Result<String, String> {
    let base = std::env::var("OLLAMA_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:11434".to_string());
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": req.model,
        "messages": req.messages,
        "stream": false,
    });
    let res = client
        .post(format!("{base}/api/chat"))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("ollama request failed: {e}"))?;
    let json: Value = res.json().await.map_err(|e| format!("ollama json parse: {e}"))?;
    json.pointer("/message/content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "ollama response missing message.content".to_string())
}
