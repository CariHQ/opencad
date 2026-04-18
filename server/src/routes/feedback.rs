use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::{
    auth::AuthUser,
    db,
    error::{AppError, Result},
    state::AppState,
};

// ── PRD feasibility classifier ────────────────────────────────────────────────

/// Keyword → (prd_label, feasibility) mapping.
/// Checked against the lowercased title + description.
const PRD_KEYWORDS: &[(&str, &str, &str)] = &[
    // 2D drafting
    ("line", "T-2D", "in_scope"),
    ("draw", "T-2D", "in_scope"),
    ("snap", "T-2D", "in_scope"),
    ("dimension", "T-2D", "in_scope"),
    ("layer", "T-2D", "in_scope"),
    ("annotation", "T-2D", "in_scope"),
    ("2d", "T-2D", "in_scope"),
    // 3D / geometry
    ("3d", "T-3D", "in_scope"),
    ("wall", "T-3D", "in_scope"),
    ("door", "T-3D", "in_scope"),
    ("window", "T-3D", "in_scope"),
    ("slab", "T-3D", "in_scope"),
    ("extrude", "T-3D", "in_scope"),
    ("boolean", "T-3D", "in_scope"),
    ("geometry", "T-3D", "in_scope"),
    // Document / BIM
    ("ifc", "T-DOC", "in_scope"),
    ("bim", "T-DOC", "in_scope"),
    ("project", "T-DOC", "in_scope"),
    ("version", "T-DOC", "in_scope"),
    ("import", "T-DOC", "in_scope"),
    ("export", "T-DOC", "in_scope"),
    ("dwg", "T-DOC", "in_scope"),
    ("revit", "T-DOC", "in_scope"),
    // Collaboration
    ("collab", "T-COL", "in_scope"),
    ("multi-user", "T-COL", "in_scope"),
    ("real-time", "T-COL", "in_scope"),
    ("share", "T-COL", "in_scope"),
    ("comment", "T-COL", "in_scope"),
    // Offline
    ("offline", "T-OFF", "in_scope"),
    ("sync", "T-OFF", "in_scope"),
    ("service worker", "T-OFF", "in_scope"),
    // AI
    ("ai", "T-AI", "in_scope"),
    ("prompt", "T-AI", "in_scope"),
    ("generate", "T-AI", "in_scope"),
    ("compliance", "T-AI", "in_scope"),
    ("code check", "T-AI", "in_scope"),
    // Desktop
    ("desktop", "T-DSK", "in_scope"),
    ("tauri", "T-DSK", "in_scope"),
    ("native", "T-DSK", "in_scope"),
];

fn assess_feasibility(title: &str, description: &str) -> (Option<String>, &'static str) {
    let haystack = format!("{} {}", title.to_lowercase(), description.to_lowercase());
    for (keyword, label, _) in PRD_KEYWORDS {
        if haystack.contains(keyword) {
            return (Some(label.to_string()), "in_scope");
        }
    }
    (None, "unclear")
}

// ── GitHub issue creation ─────────────────────────────────────────────────────

#[derive(Serialize)]
struct GitHubIssueRequest<'a> {
    title: &'a str,
    body: String,
    labels: Vec<&'a str>,
}

#[derive(Deserialize)]
struct GitHubIssueResponse {
    number: i32,
    html_url: String,
}

async fn create_github_issue(
    token: &str,
    repo: &str,
    title: &str,
    body: &str,
    category: &str,
    prd_label: Option<&str>,
) -> Option<(i32, String)> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("opencad-server/1.0")
        .build()
        .ok()?;

    let mut labels: Vec<&str> = match category {
        "bug" => vec!["bug"],
        "feature" => vec!["enhancement"],
        "question" => vec!["question"],
        _ => vec![],
    };

    if let Some(lbl) = prd_label {
        labels.push(lbl);
    }

    let formatted_body = format!(
        "{}\n\n---\n*Submitted via OpenCAD in-app feedback*",
        body
    );

    let resp = client
        .post(format!("https://api.github.com/repos/{repo}/issues"))
        .bearer_auth(token)
        .json(&GitHubIssueRequest { title, body: formatted_body, labels })
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        tracing::warn!("github issue creation failed: {}", resp.status());
        return None;
    }

    let issue: GitHubIssueResponse = resp.json().await.ok()?;
    Some((issue.number, issue.html_url))
}

// ── Request / Response types ──────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SubmitFeedbackBody {
    pub category: String,
    pub title: String,
    pub description: String,
}

#[derive(Serialize)]
pub struct FeedbackResponse {
    pub id: String,
    pub category: String,
    pub title: String,
    pub feasibility: String,
    pub prd_label: Option<String>,
    pub github_issue_url: Option<String>,
    pub github_issue_number: Option<i32>,
    pub created_at: String,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// `POST /api/v1/feedback`
///
/// Accepts a feedback submission, assesses feasibility against the PRD,
/// creates a GitHub issue (if GitHub is configured), and stores the record.
pub async fn submit(
    State(s): State<AppState>,
    user: AuthUser,
    Json(body): Json<SubmitFeedbackBody>,
) -> Result<(StatusCode, Json<FeedbackResponse>)> {
    let valid_categories = ["bug", "feature", "question"];
    if !valid_categories.contains(&body.category.as_str()) {
        return Err(AppError::BadRequest(
            "category must be bug, feature, or question".into(),
        ));
    }
    if body.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".into()));
    }
    if body.description.trim().is_empty() {
        return Err(AppError::BadRequest("description is required".into()));
    }

    let firebase_uid = user.uid().map(str::to_string);
    let (prd_label, feasibility) = assess_feasibility(&body.title, &body.description);

    // Try to create a GitHub issue if configured.
    let (github_issue_url, github_issue_number) =
        if let (Some(token), Some(repo)) = (&s.github_token, &s.github_repo) {
            let issue_body = format!(
                "## {}\n\n{}\n\n**Category:** {}\n**PRD area:** {}\n**Feasibility:** {}",
                body.title,
                body.description,
                body.category,
                prd_label.as_deref().unwrap_or("unknown"),
                feasibility,
            );
            match create_github_issue(
                token,
                repo,
                &body.title,
                &issue_body,
                &body.category,
                prd_label.as_deref(),
            )
            .await
            {
                Some((num, url)) => (Some(url), Some(num)),
                None => (None, None),
            }
        } else {
            (None, None)
        };

    let record = db::create_feedback(
        &s.db,
        db::CreateFeedbackParams {
            firebase_uid: firebase_uid.as_deref(),
            category: &body.category,
            title: body.title.trim(),
            description: body.description.trim(),
            prd_label: prd_label.as_deref(),
            feasibility,
            github_issue_url: github_issue_url.as_deref(),
            github_issue_number,
        },
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(FeedbackResponse {
            id: record.id.to_string(),
            category: record.category,
            title: record.title,
            feasibility: record.feasibility,
            prd_label: record.prd_label,
            github_issue_url: record.github_issue_url,
            github_issue_number: record.github_issue_number,
            created_at: record.created_at.to_rfc3339(),
        }),
    ))
}

/// `GET /api/v1/feedback`
///
/// Returns the current user's submitted feedback.
pub async fn list(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<FeedbackResponse>>> {
    let Some(uid) = user.uid() else {
        return Ok(Json(vec![]));
    };

    let records = db::list_feedback_by_user(&s.db, uid).await?;
    Ok(Json(
        records
            .into_iter()
            .map(|r| FeedbackResponse {
                id: r.id.to_string(),
                category: r.category,
                title: r.title,
                feasibility: r.feasibility,
                prd_label: r.prd_label,
                github_issue_url: r.github_issue_url,
                github_issue_number: r.github_issue_number,
                created_at: r.created_at.to_rfc3339(),
            })
            .collect(),
    ))
}
