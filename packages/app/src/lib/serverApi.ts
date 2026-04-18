/**
 * Server API client — all calls to the OpenCAD backend.
 *
 * Auth: Firebase ID token attached via Authorization header.
 * Base URL: proxied through Vite dev server; uses /api prefix in production.
 */

/**
 * Token provider — injected at runtime by the auth layer so serverApi.ts
 * doesn't have a hard compile-time dependency on firebase.
 */
let _getToken: (() => Promise<string | null>) | null = null;

export function registerTokenProvider(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = _getToken ? await _getToken().catch(() => null) : null;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export type FeedbackCategory = 'bug' | 'feature' | 'question';

export interface FeedbackItem {
  id: number;
  title: string;
  feasibility: string;
  prd_label: string | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
}

export const feedbackApi = {
  submit: (
    category: FeedbackCategory,
    title: string,
    description: string,
  ): Promise<FeedbackItem> =>
    apiFetch<FeedbackItem>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ category, title, description }),
    }),
};

// ── Documents ─────────────────────────────────────────────────────────────────

export interface DocumentMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export const documentsApi = {
  list: (): Promise<DocumentMeta[]> => apiFetch<DocumentMeta[]>('/documents'),
  save: (projectId: string, schema: unknown): Promise<void> =>
    apiFetch<void>(`/documents/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(schema),
    }),
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  role: string;
  trialEndsAt: number | null;
}

export const authApi = {
  me: (): Promise<UserProfile> => apiFetch<UserProfile>('/auth/me'),
};
